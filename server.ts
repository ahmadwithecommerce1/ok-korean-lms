import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  Timestamp
} from 'firebase/firestore';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';
import {
  getWhatsAppServerConfigStatus,
  processWhatsAppSend,
  retryStoredWhatsAppNotification,
} from './server/whatsappService';

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
    if (!isNaN(parsed) && parsed > 0 && parsed !== 8080) return parsed;
  }
  // Environment Constraint: Dev server must run strictly on port 3000.
  // Ignore process.env.PORT=8080 which is reserved for the platform nginx ingress.
  return 3000;
}

const PORT = 3000;

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

function normalizeServerTimeHHmm(val?: string): string | null {
  if (!val) return null;
  const match = String(val).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}`;
}

function resolveServerTimingCategory(params?: {
  timing?: string;
  batch?: string;
  punchTime?: string;
}): 'Morning' | 'Evening' {
  const timingLower = String(params?.timing || '').trim().toLowerCase();
  const batchLower = String(params?.batch || '').trim().toLowerCase();

  if (timingLower.includes('both') || (timingLower.includes('morning') && timingLower.includes('evening'))) {
    const punchHHmm = normalizeServerTimeHHmm(params?.punchTime);
    if (punchHHmm) {
      return punchHHmm >= '13:00' ? 'Evening' : 'Morning';
    }
    if (batchLower.includes('evening') || batchLower.includes('afternoon')) return 'Evening';
    return 'Morning';
  }

  if (timingLower.includes('evening') || timingLower.includes('afternoon')) return 'Evening';
  if (timingLower.includes('morning')) return 'Morning';
  if (batchLower.includes('evening') || batchLower.includes('afternoon')) return 'Evening';
  return 'Morning';
}

function evaluateServerBatchLateArrival(params: {
  punchTime?: string;
  timing?: string;
  batch?: string;
  rules?: any;
}): {
  status: 'Present' | 'Late';
  batchType: 'Morning' | 'Evening';
  ruleEnabled: boolean;
  cutoffUsed?: string;
} {
  const batchType = resolveServerTimingCategory({
    timing: params.timing,
    batch: params.batch,
    punchTime: params.punchTime,
  });
  const rules = params.rules || {};
  const ruleEnabled =
    batchType === 'Morning'
      ? Boolean(rules.morningLateEnabled)
      : Boolean(rules.eveningLateEnabled);

  if (!ruleEnabled) {
    return { status: 'Present', batchType, ruleEnabled: false };
  }

  const rawCutoff =
    batchType === 'Morning' ? rules.morningLateTime : rules.eveningLateTime;
  const cutoffHHmm = normalizeServerTimeHHmm(rawCutoff);
  const punchHHmm = normalizeServerTimeHHmm(params.punchTime);

  if (!cutoffHHmm || !punchHHmm) {
    return { status: 'Present', batchType, ruleEnabled: true, cutoffUsed: cutoffHHmm || undefined };
  }

  return {
    status: punchHHmm > cutoffHHmm ? 'Late' : 'Present',
    batchType,
    ruleEnabled: true,
    cutoffUsed: cutoffHHmm,
  };
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
app.post('/iclock/cdata', express.text({ type: '*/*', limit: '10mb' }), async (req: Request, res: Response) => {
  const sn = (req.query.SN as string) || (req.query.sn as string) || 'K40-ADMS-01';
  const table = (req.query.table as string) || 'ATTLOG';
  const rawBody = typeof req.body === 'string'
    ? req.body
    : (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : '');

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
      let deviceStatusCode = '0';

      if (line.includes('USERID=') || line.includes('CHECKTIME=')) {
        // Key-Value format (e.g. USERID=1\tCHECKTIME=2026-10-27 09:15:00\tCHECKTYPE=I)
        const parts = line.split('\t');
        for (const part of parts) {
          const [key, val] = part.split('=');
          if (key === 'USERID' || key === 'PIN') userId = val?.trim() || '';
          if (key === 'CHECKTIME' || key === 'TIME') timestamp = val?.trim() || '';
          if (key === 'CHECKTYPE' || key === 'STATUS') deviceStatusCode = val?.trim() || '0';
        }
      } else {
        // Standard Tab-separated format: PIN\tDateTime\tStatus (e.g. 1\t2026-10-27 09:15:30\t1)
        const tabParts = line.split('\t');
        if (tabParts.length >= 2) {
          userId = tabParts[0]?.trim() || '';
          timestamp = tabParts[1]?.trim() || '';
          deviceStatusCode = tabParts[2]?.trim() || '0';
        } else {
          // Space separated fallback: "1 2026-10-27 09:15:30 1 0 0"
          const tokens = line.trim().split(/\s+/);
          if (tokens.length >= 3) {
            userId = tokens[0]?.trim() || '';
            timestamp = `${tokens[1]} ${tokens[2]}`;
            deviceStatusCode = tokens[3]?.trim() || '0';
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

        // 2. Check IN/OUT Mode & Late Arrival Time settings
        let inOutModeEnabled = Boolean(configuredDevice.inOutModeEnabled);
        try {
          const devSnap = await getDoc(doc(firestore, 'settings', 'zkteco_device'));
          if (devSnap.exists() && devSnap.data()?.inOutModeEnabled !== undefined) {
            inOutModeEnabled = Boolean(devSnap.data()?.inOutModeEnabled);
          }
        } catch {}

        let attendanceRules: any = {};
        try {
          const rulesSnap = await getDoc(doc(firestore, 'settings', 'attendance_rules'));
          if (rulesSnap.exists()) {
            attendanceRules = rulesSnap.data() || {};
          }
        } catch {}

        const attendanceDocId = `att_${studentId}_${dateStr}`;
        let prevStatus: any = undefined;
        let prevRecord: any = null;
        try {
          const prevAttSnap = await getDoc(doc(firestore, 'attendance', attendanceDocId));
          if (prevAttSnap.exists()) {
            prevRecord = prevAttSnap.data();
            prevStatus = prevRecord?.status;
          }
        } catch {}

        const alreadyPunchedInToday =
          Boolean(
            prevRecord &&
              (prevRecord.punchState === 'in' ||
                ((prevRecord.status === 'Present' || prevRecord.status === 'Late') && !prevRecord.checkOutTime))
          ) ||
          Boolean(matchedStudent && matchedStudent.lastPunchDate === dateStr && matchedStudent.lastPunchState === 'in');

        let punchState: 'in' | 'out' | 'single' = 'single';
        let punchType: 'IN' | 'OUT' | 'STANDARD' = 'STANDARD';
        let checkInTime = prevRecord?.checkInTime || timeStr;
        let checkOutTime: string | undefined = prevRecord?.checkOutTime;
        let punchCount = 1;
        let remarks = `Present (Verified via ZKTeco K40 Fingerprint at ${timeStr})`;

        if (inOutModeEnabled) {
          if (alreadyPunchedInToday && prevRecord?.punchState !== 'out' && matchedStudent?.lastPunchState !== 'out') {
            punchState = 'out';
            punchType = 'OUT';
            checkInTime = prevRecord?.checkInTime || matchedStudent?.lastPunchTime || timeStr;
            checkOutTime = timeStr;
            punchCount = (prevRecord?.punchCount || 1) + 1;
            remarks = `Punch OUT at ${timeStr} (IN: ${checkInTime}) via ZKTeco K40 (${sn})`;
          } else {
            punchState = 'in';
            punchType = 'IN';
            checkInTime = timeStr;
            checkOutTime = undefined;
            punchCount = 1;
            remarks = `Punch IN at ${timeStr} via ZKTeco K40 (${sn}) — Awaiting OUT`;
          }
        }

        const evalResult = evaluateServerBatchLateArrival({
          punchTime: checkInTime,
          timing: matchedStudent?.timing,
          batch: studentBatch,
          rules: attendanceRules,
        });

        const arrivalStatus: 'Present' | 'Late' =
          punchState === 'out' && prevStatus === 'Late'
            ? 'Late'
            : evalResult.status;

        if (arrivalStatus === 'Late' && evalResult.cutoffUsed) {
          remarks = `${remarks} · ${evalResult.batchType} Late arrival (cutoff ${evalResult.cutoffUsed})`;
        } else if (!evalResult.ruleEnabled) {
          remarks = `${remarks} · ${evalResult.batchType} Neutral mode`;
        }

        const attendanceRecord = cleanPayload({
          id: attendanceDocId,
          studentId,
          studentRoll,
          studentName,
          batch: studentBatch,
          date: dateStr,
          time: timeStr,
          timestamp: `${dateStr} ${timeStr}`,
          status: arrivalStatus,
          source: 'Device',
          deviceId: sn,
          punchState,
          checkInTime,
          checkOutTime,
          punchCount,
          remarks
        });

        try {
          await setDoc(doc(firestore, 'attendance', attendanceDocId), attendanceRecord, { merge: true });
          console.log(`[ZKTeco ADMS] Recorded ${punchType} (${arrivalStatus}) attendance for ${studentName} (${studentRoll})`);

          if (matchedStudent && prevStatus !== 'Present' && prevStatus !== 'Late') {
            triggerDeviceAttendanceWhatsApp({
              student: matchedStudent,
              dateStr,
              batch: studentBatch,
              timeStr,
              attendanceStatus: arrivalStatus,
            }).catch((err) => console.warn('[WhatsApp Device Trigger Warning]', err));
          }

          // 3. Update Student verification & today's punch state
          if (matchedStudent) {
            const resolvedStudentPunchStatus =
              punchState === 'in' ? 'IN' : punchState === 'out' ? 'OUT' : 'Punched';
            await updateDoc(doc(firestore, 'students', matchedStudent.id), {
              status: matchedStudent.status === 'Pending Verification' ? 'Active' : matchedStudent.status,
              biometricEnrolled: true,
              deviceSyncStatus: 'Enrolled',
              zkDeviceId: sn,
              verificationDate: matchedStudent.verificationDate || dateStr,
              lastPunchDate: dateStr,
              lastPunchTime: timeStr,
              lastPunchState: punchState,
              punchStatus: resolvedStudentPunchStatus
            });
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
            status: arrivalStatus,
            deviceStatusCode,
            punchState,
            punchType,
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
          status: arrivalStatus,
          punchState,
          punchType
        } as any);

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
  backendApiUrl: '',
  status: 'Disconnected',
  lastSeen: '',
  firmware: 'Ver 6.60 (Build 2026)',
  pushVersion: '2.4.1',
  autoSync: true,
  inOutModeEnabled: false
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
 * Saves updated ZKTeco Device IP, Port, Backend API URL, and IN/OUT Mode to Firestore and memory
 */
app.post('/api/zkteco/settings', async (req: Request, res: Response) => {
  const { ip, port, sn, backendApiUrl, status, autoSync, inOutModeEnabled } = req.body;
  if (ip) configuredDevice.ip = ip;
  if (port) configuredDevice.port = Number(port);
  if (sn) configuredDevice.sn = sn;
  if (backendApiUrl !== undefined) configuredDevice.backendApiUrl = String(backendApiUrl).trim();
  if (status) configuredDevice.status = status;
  if (autoSync !== undefined) configuredDevice.autoSync = Boolean(autoSync);
  if (inOutModeEnabled !== undefined) configuredDevice.inOutModeEnabled = Boolean(inOutModeEnabled);

  try {
    const payload = cleanPayload({
      ...configuredDevice,
      inOutMode: Boolean(configuredDevice.inOutModeEnabled),
    });
    await setDoc(doc(firestore, 'settings', 'zkteco_device'), payload, { merge: true });
    await setDoc(
      doc(firestore, 'settings', 'global'),
      {
        inOutModeEnabled: Boolean(configuredDevice.inOutModeEnabled),
        inOutMode: Boolean(configuredDevice.inOutModeEnabled),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log(`[Bridge Server] Saved ZKTeco device config: ${configuredDevice.ip}:${configuredDevice.port} (IN/OUT Mode: ${configuredDevice.inOutModeEnabled})`);
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
  const { userId, rollNumber, sn, auditOnly, punchState: clientPunchState, punchType: clientPunchType } = req.body;
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
  let resolvedPunchState: 'in' | 'out' | 'single' = clientPunchState || 'single';
  let resolvedPunchType: 'IN' | 'OUT' | 'STANDARD' = clientPunchType || 'STANDARD';
  let inOutModeEnabled = Boolean(configuredDevice.inOutModeEnabled);
  let arrivalStatus: 'Present' | 'Late' = 'Present';

  try {
    try {
      const devSnap = await getDoc(doc(firestore, 'settings', 'zkteco_device'));
      if (devSnap.exists() && devSnap.data()?.inOutModeEnabled !== undefined) {
        inOutModeEnabled = Boolean(devSnap.data()?.inOutModeEnabled);
      }
    } catch {}

    let attendanceRules: any = {};
    try {
      const rulesSnap = await getDoc(doc(firestore, 'settings', 'attendance_rules'));
      if (rulesSnap.exists()) {
        attendanceRules = rulesSnap.data() || {};
      }
    } catch {}

    const studentsCol = collection(firestore, 'students');
    const snapshot = await getDocs(studentsCol);
    let matchedStudent: any = null;
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
        matchedStudent = { id: docSnap.id, ...data };
      }
    });

    if (studentId && !auditOnly) {
      const attId = `att_${studentId}_${dateStr}`;
      const prevAttSnap = await getDoc(doc(firestore, 'attendance', attId));
      const prevRecord = prevAttSnap.exists() ? prevAttSnap.data() : null;
      const prevStatus = prevRecord?.status;

      const alreadyPunchedInToday =
        Boolean(
          prevRecord &&
            (prevRecord.punchState === 'in' ||
              ((prevRecord.status === 'Present' || prevRecord.status === 'Late') && !prevRecord.checkOutTime))
        ) ||
        Boolean(matchedStudent && matchedStudent.lastPunchDate === dateStr && matchedStudent.lastPunchState === 'in');

      let checkInTime = prevRecord?.checkInTime || timeStr;
      let checkOutTime: string | undefined = prevRecord?.checkOutTime;
      let punchCount = 1;
      let remarks = `Biometric scan at ${timeStr} verified via ZKTeco K40 device (${deviceSn})`;

      if (inOutModeEnabled) {
        if (alreadyPunchedInToday && prevRecord?.punchState !== 'out' && matchedStudent?.lastPunchState !== 'out') {
          resolvedPunchState = 'out';
          resolvedPunchType = 'OUT';
          checkInTime = prevRecord?.checkInTime || matchedStudent?.lastPunchTime || timeStr;
          checkOutTime = timeStr;
          punchCount = (prevRecord?.punchCount || 1) + 1;
          remarks = `Punch OUT at ${timeStr} (IN: ${checkInTime}) via ZKTeco K40 (${deviceSn})`;
        } else {
          resolvedPunchState = 'in';
          resolvedPunchType = 'IN';
          checkInTime = timeStr;
          checkOutTime = undefined;
          punchCount = 1;
          remarks = `Punch IN at ${timeStr} via ZKTeco K40 (${deviceSn}) — Awaiting OUT`;
        }
      }

      const evalResult = evaluateServerBatchLateArrival({
        punchTime: checkInTime,
        timing: matchedStudent?.timing,
        batch: matchedStudent?.batch,
        rules: attendanceRules,
      });

      arrivalStatus =
        resolvedPunchState === 'out' && prevStatus === 'Late'
          ? 'Late'
          : evalResult.status;

      if (arrivalStatus === 'Late' && evalResult.cutoffUsed) {
        remarks = `${remarks} · ${evalResult.batchType} Late arrival (cutoff ${evalResult.cutoffUsed})`;
      } else if (!evalResult.ruleEnabled) {
        remarks = `${remarks} · ${evalResult.batchType} Neutral mode`;
      }

      await setDoc(doc(firestore, 'attendance', attId), cleanPayload({
        id: attId,
        studentId,
        studentRoll,
        studentName,
        batch: matchedStudent?.batch,
        date: dateStr,
        time: timeStr,
        timestamp,
        status: arrivalStatus,
        source: 'Device',
        deviceId: deviceSn,
        punchState: resolvedPunchState,
        checkInTime,
        checkOutTime,
        punchCount,
        remarks
      }), { merge: true });

      if (matchedStudent && prevStatus !== 'Present' && prevStatus !== 'Late') {
        triggerDeviceAttendanceWhatsApp({
          student: matchedStudent,
          dateStr,
          batch: matchedStudent.batch || 'Batch A (Morning 09:00 - 11:00)',
          timeStr,
          attendanceStatus: arrivalStatus,
        }).catch((err) => console.warn('[WhatsApp Simulate Punch Notice]', err));
      }

      // Activate student & persist today's punch state
      const resolvedStudentPunchStatus =
        resolvedPunchState === 'in' ? 'IN' : resolvedPunchState === 'out' ? 'OUT' : 'Punched';
      await updateDoc(doc(firestore, 'students', studentId), {
        status: matchedStudent?.status === 'Pending Verification' ? 'Active' : (matchedStudent?.status || 'Active'),
        biometricEnrolled: true,
        deviceSyncStatus: 'Enrolled',
        zkDeviceId: deviceSn,
        verificationDate: matchedStudent?.verificationDate || dateStr,
        lastPunchDate: dateStr,
        lastPunchTime: timeStr,
        lastPunchState: resolvedPunchState,
        punchStatus: resolvedStudentPunchStatus
      });

      const punchDocId = `punch_${Date.now()}_${pin}`;
      await setDoc(doc(firestore, 'zkteco_punches', punchDocId), cleanPayload({
        id: punchDocId,
        userId: pin,
        studentId,
        studentRoll,
        studentName,
        timestamp,
        date: dateStr,
        time: timeStr,
        status: arrivalStatus,
        punchState: resolvedPunchState,
        punchType: resolvedPunchType,
        deviceId: deviceSn,
        rawPayload: rawLog,
        createdAt: new Date().toISOString()
      }));
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
    status: arrivalStatus,
    punchState: resolvedPunchState,
    punchType: resolvedPunchType
  } as any);

  res.json({
    success: true,
    inOutModeEnabled,
    status: arrivalStatus,
    punchState: resolvedPunchState,
    punchType: resolvedPunchType,
    message: `Biometric attendance recorded (${arrivalStatus}) for ${studentName} (${studentRoll}) via ZKTeco K40`,
    punch: {
      userId: pin,
      studentRoll,
      studentName,
      timestamp,
      status: arrivalStatus,
      punchState: resolvedPunchState,
      punchType: resolvedPunchType,
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
// 2.2 Automated Parent WhatsApp Business Cloud API Endpoints
// ============================================================================

async function triggerDeviceAttendanceWhatsApp(params: {
  student: any;
  dateStr: string;
  batch: string;
  timeStr: string;
  attendanceStatus?: 'Present' | 'Late';
}) {
  const { student, dateStr, batch, timeStr, attendanceStatus = 'Present' } = params;
  if (!student?.id) return;

  try {
    const cfgSnap = await getDoc(doc(firestore, 'settings', 'whatsapp_config'));
    const cfg = cfgSnap.exists() ? cfgSnap.data() : {};
    if (cfg.autoSendOnAttendanceSave === false) return;

    const timingLabel = [student.studentClass, student.timing].filter(Boolean).join(' · ') || timeStr;
    const messageContent = [
      'Dear Parent/Guardian,',
      '',
      'This is an official attendance notification from OK Korean Language Center.',
      '',
      `Student: ${student.fullName}`,
      `Student ID: ${student.rollNumber || student.id}`,
      `Date: ${dateStr}`,
      `Batch: ${batch}`,
      `Class & Timing: ${timingLabel}`,
      `Attendance Status: ${attendanceStatus} (Biometric Check-in at ${timeStr})`,
      '',
      'Thank you for your cooperation.',
      '',
      'OK Korean Language Center',
    ].join('\n');

    await processWhatsAppSend(firestore, {
      notificationId: `wa_att_${student.id}_${dateStr}_initial_${attendanceStatus}`,
      uniqueKey: `att_${student.id}_${dateStr}_initial_${attendanceStatus}`,
      studentId: student.id,
      studentRoll: student.rollNumber || student.id,
      studentName: student.fullName,
      batch,
      studentClass: student.studentClass,
      timing: student.timing,
      parentWhatsApp: student.parentWhatsApp || '',
      notificationType: 'attendance',
      messageContent,
      templateParams: [
        student.fullName,
        student.rollNumber || student.id,
        dateStr,
        batch,
        attendanceStatus,
      ],
      relatedRecordId: `att_${student.id}_${dateStr}`,
      relatedDate: dateStr,
      triggerSource: 'auto_attendance',
      triggeredBy: 'ZKTeco K40 Biometric Device',
      useApprovedTemplate: Boolean(cfg.useApprovedTemplates),
      defaultCountryCode: cfg.defaultCountryCode || '92',
    });
  } catch (err) {
    console.warn('[WhatsApp Device Notification Notice]', err);
  }
}

app.get('/api/whatsapp/config-status', (_req: Request, res: Response) => {
  res.json(getWhatsAppServerConfigStatus());
});

app.post('/api/whatsapp/send', async (req: Request, res: Response) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body?.studentId || !body?.notificationId || !body?.messageContent) {
      res.status(400).json({ ok: false, error: 'Missing required notification fields.' });
      return;
    }
    const result = await processWhatsAppSend(firestore, body);
    res.json(result);
  } catch (err: any) {
    console.error('[WhatsApp Send Error]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Failed to process WhatsApp notification.' });
  }
});

app.post('/api/whatsapp/retry', async (req: Request, res: Response) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (body?.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'Only Administrators are authorized to retry WhatsApp notifications.' });
      return;
    }
    if (!body?.notificationId) {
      res.status(400).json({ ok: false, error: 'notificationId is required.' });
      return;
    }
    const result = await retryStoredWhatsAppNotification(
      firestore,
      body.notificationId,
      body.triggeredBy || 'Admin',
      undefined,
      true
    );
    res.json(result);
  } catch (err: any) {
    console.error('[WhatsApp Retry Error]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Failed to retry WhatsApp notification.' });
  }
});

app.post('/api/whatsapp/resend', async (req: Request, res: Response) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (body?.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'Only Administrators are authorized to manually resend notifications.' });
      return;
    }
    if (!body?.notificationId) {
      res.status(400).json({ ok: false, error: 'notificationId is required.' });
      return;
    }
    const result = await retryStoredWhatsAppNotification(
      firestore,
      body.notificationId,
      body.triggeredBy || 'Admin',
      body.customMessageContent,
      true
    );
    res.json(result);
  } catch (err: any) {
    console.error('[WhatsApp Resend Error]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Failed to resend WhatsApp notification.' });
  }
});

// ============================================================================
// 2.2B Official Email Communication API (Resend / SMTP)
// ============================================================================

function getEmailServerConfigStatus() {
  const resendKey = String(process.env.RESEND_API_KEY || '').trim();
  const isResendValid = Boolean(resendKey && !resendKey.toLowerCase().includes('your_') && !resendKey.toLowerCase().includes('placeholder'));

  const smtpHost = String(process.env.SMTP_HOST || '').trim();
  const smtpUser = String(process.env.SMTP_USER || '').trim();
  const smtpPass = String(process.env.SMTP_PASS || '').trim();
  const isSmtpValid = Boolean(
    smtpHost &&
      smtpUser &&
      smtpPass &&
      !smtpHost.toLowerCase().includes('example.com') &&
      !smtpPass.toLowerCase().includes('your_')
  );

  const fromAddress = String(process.env.EMAIL_FROM || smtpUser || '').trim() || null;

  if (isResendValid) {
    return {
      configured: true,
      provider: 'Resend Transactional Email API',
      fromAddress: fromAddress || 'OK Korean Language Centre <noreply@okkorean.com>',
      missingEnvVars: [] as string[],
      mode: 'resend' as const,
    };
  }

  if (isSmtpValid) {
    return {
      configured: true,
      provider: `SMTP (${smtpHost})`,
      fromAddress: fromAddress || smtpUser,
      missingEnvVars: [] as string[],
      mode: 'smtp' as const,
    };
  }

  return {
    configured: false,
    provider: 'Not Configured',
    fromAddress: null,
    missingEnvVars: ['RESEND_API_KEY (or SMTP_HOST, SMTP_USER, SMTP_PASS)', 'EMAIL_FROM'],
    mode: 'none' as const,
  };
}

app.get('/api/email/config-status', (_req: Request, res: Response) => {
  const status = getEmailServerConfigStatus();
  res.json({
    configured: status.configured,
    provider: status.provider,
    fromAddress: status.fromAddress,
    missingEnvVars: status.missingEnvVars,
  });
});

app.post('/api/email/send', async (req: Request, res: Response) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const recipients = Array.isArray(body.recipients) ? body.recipients : [];
    const validRecipients = recipients.filter((r: any) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(r?.email || '').trim()));
    const subject = String(body.subject || '').trim();
    const messageBody = String(body.body || '').trim();

    if (validRecipients.length === 0 || !subject || !messageBody) {
      res.status(400).json({
        ok: false,
        configured: getEmailServerConfigStatus().configured,
        error: 'At least one valid recipient email, a subject, and a message body are required.',
      });
      return;
    }

    const statusInfo = getEmailServerConfigStatus();
    const logId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nowIso = new Date().toISOString();

    const baseLog = {
      id: logId,
      recipientType: body.recipientType || 'Custom',
      recipients: validRecipients.map((r: any) => ({
        id: r.id || undefined,
        name: String(r.name || r.email),
        email: String(r.email).trim(),
        roleLabel: String(r.roleLabel || 'Recipient'),
      })),
      subject,
      body: messageBody,
      templateName: body.templateName || undefined,
      sentBy: body.sentBy || 'Admin',
      createdAt: nowIso,
    };

    if (!statusInfo.configured) {
      const emailLog = {
        ...baseLog,
        status: 'Not Configured',
        provider: 'None Configured',
        errorDetails: 'Email service is not configured on the server. Set RESEND_API_KEY or SMTP_HOST, SMTP_USER, and SMTP_PASS environment variables.',
      };
      await setDoc(doc(firestore, 'email_logs', logId), cleanPayload(emailLog), { merge: true });
      res.json({
        ok: false,
        configured: false,
        emailLog,
        error: emailLog.errorDetails,
      });
      return;
    }

    const toAddresses = validRecipients.map((r: any) => String(r.email).trim());

    try {
      let messageId = '';
      if (statusInfo.mode === 'resend') {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: statusInfo.fromAddress,
            to: toAddresses,
            subject,
            text: messageBody,
          }),
        });
        const resendData = await resendRes.json();
        if (!resendRes.ok) {
          throw new Error(resendData?.message || resendData?.error || `Resend HTTP ${resendRes.status}`);
        }
        messageId = resendData?.id || `resend_${Date.now()}`;
      } else {
        const smtpPort = Number(process.env.SMTP_PORT || 587);
        const smtpSecure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || smtpPort === 465;
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: smtpPort,
          secure: smtpSecure,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        const info = await transporter.sendMail({
          from: statusInfo.fromAddress || process.env.SMTP_USER,
          to: toAddresses.join(', '),
          subject,
          text: messageBody,
        });
        messageId = info.messageId || `smtp_${Date.now()}`;
      }

      const emailLog = {
        ...baseLog,
        status: 'Sent',
        provider: statusInfo.provider,
        messageId,
      };
      await setDoc(doc(firestore, 'email_logs', logId), cleanPayload(emailLog), { merge: true });
      res.json({ ok: true, configured: true, emailLog });
    } catch (sendErr: any) {
      const emailLog = {
        ...baseLog,
        status: 'Failed',
        provider: statusInfo.provider,
        errorDetails: sendErr?.message || 'SMTP / Resend delivery error',
      };
      await setDoc(doc(firestore, 'email_logs', logId), cleanPayload(emailLog), { merge: true });
      res.status(502).json({
        ok: false,
        configured: true,
        emailLog,
        error: emailLog.errorDetails,
      });
    }
  } catch (err: any) {
    console.error('[Email Send Error]', err);
    res.status(500).json({ ok: false, configured: false, error: err?.message || 'Failed to process email dispatch.' });
  }
});

// ============================================================================
// 2.3 Teacher Activity Offline Beacon Endpoint
// ============================================================================

function formatServerSessionDuration(loginMs: number, logoutMs: number): string {
  const diffMs = Math.max(0, logoutMs - loginMs);
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${mins} ${mins === 1 ? 'min' : 'mins'}`;
  }
  if (hours > 0) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  }
  if (totalMinutes > 0) {
    return `${totalMinutes} ${totalMinutes === 1 ? 'min' : 'mins'}`;
  }
  return '< 1 min';
}

app.post('/api/teacher-activity/offline', async (req: Request, res: Response) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const sessionId = String(body.sessionId || '').trim();
    if (!sessionId) {
      res.status(400).json({ ok: false, error: 'sessionId is required' });
      return;
    }

    const nowTs = Timestamp.now();
    const nowMs = nowTs.toMillis();
    const docRef = doc(firestore, 'teacher_activity', sessionId);
    let loginMs = Number(body.loginTimeMs) || 0;

    if (!loginMs) {
      const existingSnap = await getDoc(docRef);
      if (existingSnap.exists()) {
        const lt = existingSnap.data()?.loginTime;
        if (typeof lt?.toMillis === 'function') loginMs = lt.toMillis();
        else if (typeof lt?.seconds === 'number') loginMs = lt.seconds * 1000;
      }
    }

    const sessionDuration = loginMs ? formatServerSessionDuration(loginMs, nowMs) : '< 1 min';

    await setDoc(
      docRef,
      {
        status: 'Offline',
        logoutTime: nowTs,
        sessionDuration,
        totalSessionTime: sessionDuration,
        lastActiveTabTime: nowTs,
        lastActiveAt: nowTs,
      },
      { merge: true }
    );

    res.json({ ok: true, sessionId, status: 'Offline', sessionDuration, totalSessionTime: sessionDuration });
  } catch (err: any) {
    console.warn('[Teacher Activity Offline Beacon Warning]', err?.message || err);
    res.status(500).json({ ok: false, error: err?.message || 'Failed to mark session offline' });
  }
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
