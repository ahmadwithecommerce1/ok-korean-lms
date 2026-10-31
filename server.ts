import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase configuration for Firestore persistence
const firebaseConfig = {
  apiKey: "AIzaSyB7bfHpaV2njsvG95KSqnj1IH6AZCkzE9A",
  authDomain: "ok-lms-web-app.firebaseapp.com",
  projectId: "ok-lms-web-app",
  storageBucket: "ok-lms-web-app.firebasestorage.app",
  messagingSenderId: "443194825966",
  appId: "1:443194825966:web:e25e74040c4f489a7c67ff",
  measurementId: "G-FHF03PCMYJ"
};

const fbApp = initializeApp(firebaseConfig);
const firestore = getFirestore(fbApp);

// Process safety guards
process.on('unhandledRejection', (reason) => {
  console.warn('[Process] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err);
});

const app = express();

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const parsed = parseInt(process.argv[portArgIndex + 1], 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (process.env.PORT) {
    const parsed = parseInt(process.env.PORT, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return 3000;
}

const PORT = getPort();

// CORS headers
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

// Middleware for parsing raw ZKTeco ADMS text strings, URL-encoded data, and JSON
app.use(express.text({ type: ['text/*', 'application/octet-stream', 'application/x-www-form-urlencoded'], limit: '10mb' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory state for connected ZKTeco devices and punch logs
interface ConnectedDevice {
  sn: string;
  ip: string;
  firmware?: string;
  lastSeen: string;
  totalPunches: number;
  pushVersion?: string;
}

const connectedDevices = new Map<string, ConnectedDevice>();
const recentPunches: Array<{
  id: string;
  userId: string;
  studentRoll?: string;
  studentName?: string;
  timestamp: string;
  sn: string;
  status: string;
}> = [];

// Device Command Queue (e.g. biometric enrollment signals)
interface DeviceCommand {
  id: string;
  cmd: string;
  studentId: string;
  rollNumber: string;
  fullName?: string;
  pin: string;
  status: 'queued' | 'sent' | 'executed' | 'failed';
  createdAt: string;
}

const commandQueue: DeviceCommand[] = [];

// Helper to sanitize Firestore document payloads (remove undefined)
function cleanPayload<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key as keyof T] = val;
    }
  }
  return result;
}

// ============================================================================
// 1. ZKTeco K40 ADMS Device Endpoints (Push / iClock Protocol)
// ============================================================================

/**
 * GET /iclock/cdata
 * Handshake / Heartbeat and configuration query from ZKTeco K40 device.
 * When K40 powers on or connects, it requests configuration parameters.
 */
app.get('/iclock/cdata', (req: Request, res: Response) => {
  const sn = (req.query.SN as string) || (req.query.sn as string) || 'UNKNOWN_K40';
  const pushver = (req.query.pushver as string) || '2.4.1';
  const clientIp = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || '127.0.0.1';

  connectedDevices.set(sn, {
    sn,
    ip: clientIp,
    firmware: (req.query.language as string) || 'ZKTeco K40 Firmware',
    lastSeen: new Date().toISOString(),
    totalPunches: (connectedDevices.get(sn)?.totalPunches || 0),
    pushVersion: pushver
  });

  console.log(`[ZKTeco ADMS] Heartbeat received from K40 (SN: ${sn}, IP: ${clientIp})`);

  // ZKTeco ADMS Standard Configuration Response
  const admsConfigResponse = [
    `GET OPTION FROM: ${sn}`,
    'Stamp=9999',
    'OpStamp=9999',
    'ErrorDelay=60',
    'Delay=30',
    'ResStamp=9999',
    'TransTimes=00:00;14:05',
    'TransInterval=1',
    'TransFlag=TransData AttLog\tOpLog\tAttPhoto\tEnrollFP\tEnrollUser',
    'TimeZone=5',
    'Realtime=1',
    'Encrypt=0',
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(admsConfigResponse);
});

/**
 * POST /iclock/cdata
 * The primary attendance log ingestion route.
 * ZKTeco K40 uploads raw attendance logs when a fingerprint/card/PIN is scanned.
 *
 * Typical Raw Formats sent by K40:
 * Format A (tab separated):
 * 1\t2026-10-27 09:15:30\t1\t0\t0\t0\r\n
 * Format B (key-value separated):
 * USERID=1\tCHECKTIME=2026-10-27 09:15:30\tCHECKTYPE=I\tVERIFYTYPE=1
 */
app.post('/iclock/cdata', async (req: Request, res: Response) => {
  const sn = (req.query.SN as string) || (req.query.sn as string) || 'K40-ADMS-01';
  const table = (req.query.table as string) || 'ATTLOG';
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  console.log(`[ZKTeco ADMS POST] Table: ${table}, SN: ${sn}, Raw length: ${rawBody?.length || 0}`);

  // Update device active status
  const existingDev = connectedDevices.get(sn) || {
    sn,
    ip: req.socket.remoteAddress || '127.0.0.1',
    lastSeen: new Date().toISOString(),
    totalPunches: 0
  };
  existingDev.lastSeen = new Date().toISOString();

  let processedCount = 0;

  if (rawBody && typeof rawBody === 'string') {
    const lines = rawBody.split(/\r?\n/).filter(line => line.trim().length > 0);

    for (const line of lines) {
      let userId = '';
      let timestamp = '';

      if (line.includes('USERID=') || line.includes('CHECKTIME=')) {
        // Key-Value format (e.g. USERID=1\tCHECKTIME=2026-10-27 09:15:00)
        const parts = line.split('\t');
        for (const part of parts) {
          const [key, val] = part.split('=');
          if (key === 'USERID' || key === 'PIN') userId = val?.trim() || '';
          if (key === 'CHECKTIME' || key === 'TIME') timestamp = val?.trim() || '';
        }
      } else {
        // Standard Tab/Space-separated format:
        // Column 0: USERID / PIN
        // Column 1: TIMESTAMP (YYYY-MM-DD HH:mm:ss)
        const parts = line.split(/[\t\s]{2,}|\t/);
        if (parts.length >= 2) {
          userId = parts[0]?.trim();
          timestamp = parts[1]?.trim();
        } else {
          // Space separated fallback: "1 2026-10-27 09:15:30 1 0 0"
          const tokens = line.trim().split(/\s+/);
          if (tokens.length >= 3) {
            userId = tokens[0]?.trim();
            timestamp = `${tokens[1]} ${tokens[2]}`;
          }
        }
      }

      if (userId && timestamp) {
        processedCount++;
        existingDev.totalPunches++;

        const now = new Date();
        const dateStr = timestamp.split(' ')[0] || now.toISOString().split('T')[0];
        const timeStr = timestamp.split(' ')[1] || now.toTimeString().split(' ')[0];

        // 1. Resolve student record from Firestore
        let matchedStudent: any = null;
        try {
          const studentsCol = collection(firestore, 'students');
          const snapshot = await getDocs(studentsCol);
          
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const cleanUser = userId.toLowerCase();
            const roll = (data.rollNumber || '').toLowerCase();
            const pin = (data.biometricPin || '').toLowerCase();
            const docId = docSnap.id.toLowerCase();
            
            // Numeric extraction: e.g. "1" matches "OK-2025-001"
            const numRoll = roll.replace(/[^0-9]/g, '');
            const numUser = cleanUser.replace(/[^0-9]/g, '');

            if (
              roll === cleanUser || 
              pin === cleanUser || 
              docId === cleanUser ||
              (numRoll && numUser && (numRoll === numUser || parseInt(numRoll, 10) === parseInt(numUser, 10) || numRoll.endsWith(numUser)))
            ) {
              matchedStudent = { id: docSnap.id, ...data };
            }
          });
        } catch (e) {
          console.warn('[ZKTeco ADMS] Error querying Firestore students:', e);
        }

        const studentRoll = matchedStudent ? matchedStudent.rollNumber : `PIN-${userId}`;
        const studentName = matchedStudent ? matchedStudent.fullName : `Unregistered PIN (${userId})`;
        const studentBatch = matchedStudent ? matchedStudent.batch : 'Batch A (Morning 09:00 - 11:00)';
        const studentId = matchedStudent ? matchedStudent.id : `zk_temp_${userId}`;

        // 2. Save Attendance Record to Firestore
        const attendanceDocId = `att_${studentId}_${dateStr}`;
        const attendanceRecord = cleanPayload({
          id: attendanceDocId,
          studentId,
          studentRoll,
          studentName,
          batch: studentBatch,
          date: dateStr,
          time: timeStr,
          status: 'Present',
          source: 'zkteco_k40',
          deviceId: sn,
          remarks: `Present (Verified via ZKTeco K40 Fingerprint at ${timeStr})`
        });

        try {
          await setDoc(doc(firestore, 'attendance', attendanceDocId), attendanceRecord, { merge: true });
          console.log(`[ZKTeco ADMS] Successfully recorded attendance for ${studentName} (${studentRoll})`);

          // 3. Student Registration & Verification Flow:
          // If candidate status was 'Pending Verification', automatically activate their profile!
          if (matchedStudent && (matchedStudent.status === 'Pending Verification' || !matchedStudent.biometricEnrolled)) {
            await updateDoc(doc(firestore, 'students', matchedStudent.id), {
              status: 'Active',
              biometricEnrolled: true,
              zkDeviceId: sn,
              verificationDate: dateStr
            });
            console.log(`[ZKTeco ADMS] Candidate ${studentName} verified on K40! Status updated to 'Active'`);
          }

          // Save punch to zkteco_punches audit trail collection
          const punchDocId = `punch_${Date.now()}_${userId}`;
          await setDoc(doc(firestore, 'zkteco_punches', punchDocId), cleanPayload({
            id: punchDocId,
            userId,
            studentId,
            studentRoll,
            studentName,
            timestamp,
            date: dateStr,
            time: timeStr,
            status: 'Present',
            deviceId: sn,
            rawPayload: line,
            createdAt: new Date().toISOString()
          }));
        } catch (err) {
          console.error('[ZKTeco ADMS] Firestore write error:', err);
        }

        recentPunches.unshift({
          id: `punch_${Date.now()}_${userId}`,
          userId,
          studentRoll,
          studentName,
          timestamp,
          sn,
          status: 'Present'
        });

        if (recentPunches.length > 50) recentPunches.pop();
      }
    }
  }

  connectedDevices.set(sn, existingDev);

  // ZKTeco protocol ACK: device requires "OK" or "OK: <count>" to clear its local buffer
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send(`OK: ${processedCount}`);
});

/**
 * GET /iclock/getrequest
 * K40 device periodically checks for pending commands (e.g. Enroll Fingerprint, User Updates).
 */
app.get('/iclock/getrequest', (req: Request, res: Response) => {
  const sn = (req.query.SN as string) || (req.query.sn as string) || '';

  // Look for pending commands in the queue
  const nextCommand = commandQueue.find(cmd => cmd.status === 'queued');

  if (nextCommand) {
    nextCommand.status = 'sent';
    res.setHeader('Content-Type', 'text/plain');
    res.status(200).send(nextCommand.cmd);
    console.log(`[ZKTeco ADMS] Dispatched command to ${sn}: ${nextCommand.cmd}`);
    return;
  }

  // No pending commands, return OK
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('OK');
});

/**
 * POST /iclock/devicecmd
 * K40 reports back execution results of commands.
 */
app.post('/iclock/devicecmd', async (req: Request, res: Response) => {
  const sn = (req.query.SN as string) || (req.query.sn as string) || '';
  const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  console.log(`[ZKTeco ADMS] Device command result from ${sn}: ${body}`);

  // Example body: ID=101&Return=0&CMD=ENROLL_FP
  if (body.includes('Return=0') || body.includes('Return=1')) {
    // Check if an enrollment command succeeded
    const cmdIdMatch = body.match(/ID=(\d+)/);
    const returnCodeMatch = body.match(/Return=(\d+)/);

    if (cmdIdMatch && returnCodeMatch && returnCodeMatch[1] === '0') {
      const cmdId = cmdIdMatch[1];
      const cmd = commandQueue.find(c => c.id === cmdId);
      if (cmd) {
        cmd.status = 'executed';
        // Confirm student activation in Firestore
        try {
          await updateDoc(doc(firestore, 'students', cmd.studentId), {
            status: 'Active',
            biometricEnrolled: true,
            zkDeviceId: sn,
            verificationDate: new Date().toISOString().split('T')[0]
          });
          console.log(`[ZKTeco ADMS] Confirmed fingerprint enrollment for student ${cmd.fullName}`);
        } catch (e) {
          console.warn('Error updating student status after devicecmd:', e);
        }
      }
    }
  }

  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('OK');
});

/**
 * POST /iclock/registry
 * Device registration handshake
 */
app.post('/iclock/registry', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.status(200).send('RegistryCode=OK');
});

// ============================================================================
// 2. REST API for Web App Integration & Real-time Biometric Testing
// ============================================================================

let configuredDevice = {
  ip: '192.168.1.201',
  port: 4370,
  sn: 'K40-ADMS-01',
  status: 'Disconnected',
  lastSeen: '',
  firmware: 'Ver 6.60 (Build 2026)',
  pushVersion: '2.4.1',
  autoSync: true
};

/**
 * GET /api/zkteco/settings
 * Returns current ZKTeco Device IP, Port, and Configuration
 */
app.get('/api/zkteco/settings', async (_req: Request, res: Response) => {
  try {
    const docSnap = await getDocs(query(collection(firestore, 'settings'), where('__name__', '==', 'zkteco_device')));
    if (!docSnap.empty) {
      const data = docSnap.docs[0].data();
      configuredDevice = { ...configuredDevice, ...data };
    }
  } catch (e) {
    console.warn('Error reading zkteco_device from Firestore in server.ts:', e);
  }
  res.json(configuredDevice);
});

/**
 * POST /api/zkteco/settings
 * Saves updated ZKTeco Device IP and Port to Firestore and memory
 */
app.post('/api/zkteco/settings', async (req: Request, res: Response) => {
  const { ip, port, sn, status, autoSync } = req.body;
  if (ip) configuredDevice.ip = ip;
  if (port) configuredDevice.port = Number(port);
  if (sn) configuredDevice.sn = sn;
  if (status) configuredDevice.status = status;
  if (autoSync !== undefined) configuredDevice.autoSync = Boolean(autoSync);

  try {
    await setDoc(doc(firestore, 'settings', 'zkteco_device'), cleanPayload(configuredDevice), { merge: true });
    console.log(`[Bridge Server] Saved ZKTeco device config: ${configuredDevice.ip}:${configuredDevice.port}`);
  } catch (e) {
    console.warn('Error saving zkteco_device in server.ts:', e);
  }

  res.json({ success: true, settings: configuredDevice });
});

/**
 * GET /api/zkteco/status
 * Returns connection status of ZKTeco K40 devices, recent punches, and command queue.
 */
app.get('/api/zkteco/status', (req: Request, res: Response) => {
  const devicesList = Array.from(connectedDevices.values());
  const isActuallyConnected = devicesList.some(d => {
    const diffMs = Date.now() - new Date(d.lastSeen).getTime();
    return diffMs < 120000;
  });

  const connectionStatus = isActuallyConnected || configuredDevice.status === 'Connected' ? 'Connected' : 'Disconnected';

  res.json({
    online: isActuallyConnected,
    status: connectionStatus,
    configuredDevice,
    devices: devicesList.length > 0 ? devicesList : [
      {
        sn: configuredDevice.sn,
        ip: configuredDevice.ip,
        port: configuredDevice.port,
        firmware: configuredDevice.firmware,
        lastSeen: new Date().toISOString(),
        totalPunches: recentPunches.length,
        status: connectionStatus,
        pushVersion: configuredDevice.pushVersion
      }
    ],
    recentPunches: recentPunches.slice(0, 15),
    commandQueueLength: commandQueue.filter(c => c.status === 'queued').length,
    endpointUrl: `http://${req.headers.host || 'localhost:3000'}/iclock/cdata`
  });
});

/**
 * POST /api/zkteco/simulate-punch
 * Allows simulating a ZKTeco K40 biometric scan from the Web App.
 */
app.post('/api/zkteco/simulate-punch', async (req: Request, res: Response) => {
  const { userId, rollNumber, sn } = req.body;
  const pin = userId || (rollNumber ? rollNumber.replace(/[^0-9]/g, '') : '1');
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().split(' ')[0];
  const timestamp = `${dateStr} ${timeStr}`;
  const deviceSn = sn || 'K40-ADMS-01';

  // Construct standard ZKTeco raw punch line: <USERID>\t<TIMESTAMP>\t1\t0\t0\t0
  const rawLog = `${pin}\t${timestamp}\t1\t0\t0\t0`;

  // Process the punch
  let studentName = 'Test Student';
  let studentRoll = rollNumber || `OK-2025-${pin.padStart(3, '0')}`;
  let studentId = '';

  try {
    const studentsCol = collection(firestore, 'students');
    const snapshot = await getDocs(studentsCol);
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const numRoll = (data.rollNumber || '').replace(/[^0-9]/g, '');
      const numPin = pin.replace(/[^0-9]/g, '');
      if (
        data.rollNumber?.toLowerCase() === studentRoll.toLowerCase() ||
        data.biometricPin === pin ||
        (numRoll && numPin && parseInt(numRoll, 10) === parseInt(numPin, 10))
      ) {
        studentName = data.fullName;
        studentRoll = data.rollNumber;
        studentId = docSnap.id;
      }
    });

    if (studentId) {
      // Record attendance
      const attId = `att_${studentId}_${dateStr}`;
      await setDoc(doc(firestore, 'attendance', attId), cleanPayload({
        id: attId,
        studentId,
        studentRoll,
        studentName,
        date: dateStr,
        time: timeStr,
        status: 'Present',
        source: 'zkteco_k40',
        deviceId: deviceSn,
        remarks: `Biometric scan at ${timeStr} verified via ZKTeco K40 device (${deviceSn})`
      }), { merge: true });

      // Activate student if pending verification
      await updateDoc(doc(firestore, 'students', studentId), {
        status: 'Active',
        biometricEnrolled: true,
        zkDeviceId: deviceSn,
        verificationDate: dateStr
      });
    }
  } catch (e) {
    console.warn('[Simulate Punch] Firestore warning:', e);
  }

  recentPunches.unshift({
    id: `punch_${Date.now()}_${pin}`,
    userId: pin,
    studentRoll,
    studentName,
    timestamp,
    sn: deviceSn,
    status: 'Present'
  });

  res.json({
    success: true,
    message: `Biometric attendance recorded for ${studentName} (${studentRoll}) via ZKTeco K40`,
    punch: {
      userId: pin,
      studentRoll,
      studentName,
      timestamp,
      status: 'Present',
      rawLog
    }
  });
});

/**
 * POST /api/zkteco/enroll-request
 * Web App sends an Enroll Request (with Student ID & PIN) to the ZKTeco Bridge Server.
 */
app.post('/api/zkteco/enroll-request', async (req: Request, res: Response) => {
  const { studentId, rollNumber, fullName, pin } = req.body;
  if (!studentId) {
    res.status(400).json({ error: 'studentId is required' });
    return;
  }

  const numericPin = pin || rollNumber?.replace(/[^0-9]/g, '') || '1';
  const commandId = `${Date.now() % 100000}`;

  // Formulate ZKTeco K40 Enroll Command: C:<ID>:ENROLL_FP PIN=<PIN>\tRETRY=3
  const cmdString = `C:${commandId}:ENROLL_FP PIN=${numericPin}\tRETRY=3`;

  const newCommand: DeviceCommand = {
    id: commandId,
    cmd: cmdString,
    studentId,
    rollNumber: rollNumber || '',
    fullName: fullName || '',
    pin: numericPin,
    status: 'queued',
    createdAt: new Date().toISOString()
  };

  commandQueue.push(newCommand);

  // Store enroll request in Firestore
  try {
    await setDoc(doc(firestore, 'zkteco_enrollments', `zk_enroll_${studentId}`), cleanPayload({
      id: `zk_enroll_${studentId}`,
      studentId,
      rollNumber,
      fullName,
      pin: numericPin,
      status: 'Pending Verification',
      createdAt: new Date().toISOString()
    }), { merge: true });
  } catch (e) {
    console.warn('Firestore zkteco_enrollments write warning:', e);
  }

  console.log(`[ZKTeco ADMS] Queued biometric enrollment for ${fullName} (${rollNumber}, PIN ${numericPin})`);

  res.json({
    success: true,
    message: `Enroll request for ${fullName} (PIN ${numericPin}) queued to ZKTeco K40`,
    commandId,
    status: 'queued'
  });
});

/**
 * POST /api/zkteco/verify-student
 * Confirm fingerprint capture and activate candidate in Firestore.
 */
app.post('/api/zkteco/verify-student', async (req: Request, res: Response) => {
  const { studentId, deviceId } = req.body;
  if (!studentId) {
    res.status(400).json({ error: 'studentId is required' });
    return;
  }

  const sn = deviceId || 'K40-ADMS-01';
  const today = new Date().toISOString().split('T')[0];

  try {
    await updateDoc(doc(firestore, 'students', studentId), {
      status: 'Active',
      biometricEnrolled: true,
      zkDeviceId: sn,
      verificationDate: today
    });

    await setDoc(doc(firestore, 'zkteco_enrollments', `zk_enroll_${studentId}`), {
      status: 'Active',
      enrolledAt: new Date().toISOString()
    }, { merge: true });

    res.json({ success: true, message: 'Student successfully verified and activated.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update student' });
  }
});

// ============================================================================
// 2.1 AI Support Assistant API: M. Ahmad E-Commerce (Gemini API)
// ============================================================================

function generateExpertSupportResponse(query: string): string {
  const q = query.toLowerCase();

  if (q.includes('zkteco') || q.includes('k40') || q.includes('fingerprint') || q.includes('biometric') || q.includes('adms') || q.includes('device')) {
    return `**M. Ahmad E-Commerce Technical Guide: ZKTeco K40 Fingerprint Setup & Sync**

1. **Verify Device Communication:**
   - Confirm your ZKTeco K40 device is on the same local network subnet (Default IP: \`192.168.1.201\`, Port: \`4370\`).
   - For Cloud ADMS push, open device **Comm. -> Cloud Server Settings** and enter this server's host with Port \`3000\`.

2. **Student Biometric Registration:**
   - In **Student Directory**, find any student marked with **"Pending Verification"**.
   - Click the **"Send Enroll Request"** action button. This queues an \`ENROLL_FP\` command with their assigned biometric PIN.
   - Have the candidate place their thumb on the optical scanner 3 times until the device beeps twice.

3. **Attendance Verification:**
   - Upon successful scan, attendance writes directly to the Firestore \`attendance\` collection with timestamp, and student status upgrades to **Active**.`;
  }

  if (q.includes('excel') || q.includes('bulk') || q.includes('upload') || q.includes('import') || q.includes('csv')) {
    return `**M. Ahmad E-Commerce Technical Guide: Excel Bulk Student Import**

1. Go to the **Student Directory** screen in the left navigation.
2. Click the **"Import Excel"** button in the top action bar.
3. Ensure your spreadsheet contains the required header columns:
   - **Roll No** (Format: \`OK-2025-XXX\`)
   - **Full Name**
   - **Father Name**
   - **Parent WhatsApp** (Format: \`+92 3XXXXXXXXX\`)
   - **Batch** (e.g., \`Batch A (Morning 09:00 - 11:00)\`)
   - **Level** (e.g., \`Level 1 - Beginner (TOPIK I)\`)
4. Drop your file and click **"Commit to Firestore"**. The system validates duplicates and automatically creates biometric PIN records.`;
  }

  if (q.includes('fee') || q.includes('challan') || q.includes('voucher') || q.includes('payment') || q.includes('ledger') || q.includes('tuition')) {
    return `**M. Ahmad E-Commerce Technical Guide: PKR Tuition Fee & Challan Vouchers**

1. Open the **Fee Ledger** module from the navigation.
2. Locate the student and select **"Generate Challan"**.
3. Specify the billing period (Month/Year), standard tuition fee (in PKR), and due date.
4. Click **"Print / Download PDF"** to generate an official 3-part bank voucher (Student Copy, Accounts Copy, Academy Copy) with QR verification and authorized signature blocks.`;
  }

  if (q.includes('test') || q.includes('score') || q.includes('topik') || q.includes('marks') || q.includes('exam')) {
    return `**M. Ahmad E-Commerce Technical Guide: Weekly & TOPIK Test Management**

1. Navigate to **Weekly Tests** in the portal sidebar.
2. Click **"New Test Entry"** to log weekly scores (Listening, Reading, Vocabulary).
3. The platform computes batch aggregates, passing percentages, and tracks student progress towards TOPIK I & II benchmarks.`;
  }

  if (q.includes('teacher') || q.includes('role') || q.includes('permission') || q.includes('account') || q.includes('login') || q.includes('password')) {
    return `**M. Ahmad E-Commerce Technical Guide: User Roles & Permissions**

1. **Admin Portal:** Grants complete access to device settings, biometric enrollments, fee adjustments, and student deletions.
2. **Teacher Portal:** Provides focused access to attendance marking, weekly test scoring, and student directory viewing.
3. **Password Resets:** For security compliance, password changes require Administrator verification via the central management console.`;
  }

  return `Hello! I am **M. Ahmad E-Commerce**, your dedicated AI support assistant for OK Korean Language Center.

Here is how I can help resolve common issues:
- **Biometrics:** Check the ZKTeco K40 device status in Settings to ensure heartbeat signal.
- **Data Sync:** Click the sync icon in the top header to force a Firestore refresh.
- **Clear Cache:** If you encounter unexpected UI glitches, refresh your browser tab.

Please let me know specifically which module or feature you need assistance with!`;
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'PLACEHOLDER_GEMINI_API_KEY',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.post('/api/support-chat', async (req: Request, res: Response) => {
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }
  const message = body?.message;
  const history = body?.history;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'message string is required' });
    return;
  }

  const systemInstruction = 
    "You are M. Ahmad E-Commerce, the dedicated AI support assistant for OK Korean Language Center LMS. " +
    "Your job is to politely help users if they face any technical issues with the app. " +
    "Give clear, step-by-step solutions for: " +
    "1. ZKTeco K40 biometric device connectivity, IP/Port configuration, and fingerprint enrollment. " +
    "2. Student Directory management, pending verification activations, and status changes. " +
    "3. Excel bulk student uploads (format: Roll No, Name, Father Name, Parent WhatsApp, Batch, Level). " +
    "4. PKR Tuition Fee Challan voucher printing, status tracking, and ledgers. " +
    "5. Weekly & TOPIK test score entries and reports. " +
    "6. Account roles (Admin vs Teacher) and permission levels. " +
    "Always maintain a polite, courteous, and professional tone as M. Ahmad E-Commerce. Use bold points and numbered steps for clarity.";

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && apiKey !== 'PLACEHOLDER_GEMINI_API_KEY') {
    try {
      const formattedContents: any[] = [];
      if (Array.isArray(history)) {
        for (const item of history) {
          if (item.text && (item.role === 'user' || item.role === 'model')) {
            formattedContents.push({
              role: item.role,
              parts: [{ text: item.text }]
            });
          }
        }
      }

      formattedContents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API timeout')), 6000)
      );

      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: formattedContents,
        config: {
          systemInstruction,
        }
      });

      const response: any = await Promise.race([generatePromise, timeoutPromise]);

      if (response && response.text) {
        res.json({ reply: response.text });
        return;
      }
    } catch (err: any) {
      console.warn('[Support Chat] Gemini API notice (providing expert fallback):', err?.message || err);
    }
  }

  // Fast, reliable expert support resolution
  const reply = generateExpertSupportResponse(message);
  res.json({ reply });
});

// ============================================================================
// 3. Mount Vite Dev Server in Development / Static Dist in Production
// ============================================================================
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath);
  // Default to dev mode unless NODE_ENV is strictly production AND dist folder exists
  const isDev = process.env.NODE_ENV !== 'production' || !hasDist;

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);

    // Serve HTML for SPA navigation routes (excluding /api, /iclock, and files with extensions)
    app.use(async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      if (req.method !== 'GET' || url.startsWith('/api') || url.startsWith('/iclock')) {
        return next();
      }
      const ext = path.extname(req.path);
      if (ext && ext !== '.html') {
        return next();
      }
      try {
        const indexPath = path.resolve(__dirname, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });

    console.log('[Express Server] Vite dev server mounted in middleware mode');
  } else {
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`  OK KOREAN LMS - Enterprise Server Running on Port ${PORT}`);
    console.log(`  ZKTeco K40 ADMS Endpoint: http://0.0.0.0:${PORT}/iclock/cdata`);
    console.log(`  AI Support Assistant: http://0.0.0.0:${PORT}/api/support-chat`);
    console.log(`  Cloud Firestore Sync: Active (Project: ok-lms-web-app)`);
    console.log(`=======================================================`);
  });

  server.on('error', (err: any) => {
    console.error('[Server Error]', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use.`);
    }
  });

  const cleanup = () => {
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

startServer().catch(err => {
  console.error('Fatal Server Startup Error:', err);
});
