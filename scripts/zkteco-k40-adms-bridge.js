/**
 * ============================================================================
 * OK KOREAN LMS - ZKTeco K40 ADMS Real-time Biometric Attendance Bridge Server
 * ============================================================================
 *
 * This standalone Node.js script acts as an ADMS (Automatic Data Master Server)
 * endpoint for your ZKTeco K40 fingerprint time attendance device.
 *
 * HOW TO CONFIGURE YOUR ZKTECO K40 DEVICE:
 * ----------------------------------------------------------------------------
 * 1. Power on your ZKTeco K40 device.
 * 2. Press [M/OK] to open the Main Menu -> Comm. (Communication) -> Cloud Server Server (or WebServer / ADMS).
 * 3. Set the following parameters:
 *      - Cloud Server Enable: YES
 *      - Server Address (Server IP): <Your Server IP or Domain>
 *      - Server Port: 3000 (or the port where this bridge is running)
 *      - Request URL (if prompted): /iclock/cdata
 * 4. Save and reboot the device.
 *
 * Once connected, the device will send heartbeats and automatically push
 * attendance logs (raw tab-separated punch strings) to this server in real time.
 * This script parses the USERID and TIMESTAMP and syncs to Firestore attendance.
 *
 * USAGE:
 * node scripts/zkteco-k40-adms-bridge.js
 * ============================================================================
 */

import http from 'http';
import url from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDocs, collection, updateDoc } from 'firebase/firestore';

const PORT = process.env.ADMS_PORT || 3000;

// Firebase configuration for direct Firestore synchronization
const firebaseConfig = {
  apiKey: "AIzaSyB7bfHpaV2njsvG95KSqnj1IH6AZCkzE9A",
  authDomain: "ok-lms-web-app.firebaseapp.com",
  projectId: "ok-lms-web-app",
  storageBucket: "ok-lms-web-app.firebasestorage.app",
  messagingSenderId: "443194825966",
  appId: "1:443194825966:web:e25e74040c4f489a7c67ff",
  measurementId: "G-FHF03PCMYJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// In-memory connected device registry and command queue
const connectedDevices = new Map();
const commandQueue = [];

console.log('================================================================');
console.log('  OK KOREAN LMS - ZKTeco K40 ADMS Biometric Bridge Initializing');
console.log('================================================================');

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;
  const query = parsedUrl.query;

  // 1. Handshake / Heartbeat (GET /iclock/cdata)
  if (pathname === '/iclock/cdata' && method === 'GET') {
    const sn = query.SN || query.sn || 'K40-DEVICE';
    connectedDevices.set(sn, {
      sn,
      ip: req.socket.remoteAddress,
      lastSeen: new Date().toISOString()
    });

    console.log(`[ZKTeco ADMS] Heartbeat from Device SN: ${sn}`);

    // Standard ZKTeco ADMS config handshake reply
    const config = [
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

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(config);
    return;
  }

  // 2. Punch Log Ingestion (POST /iclock/cdata)
  if (pathname === '/iclock/cdata' && method === 'POST') {
    const sn = query.SN || query.sn || 'K40-ADMS-01';
    let body = '';

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      console.log(`[ZKTeco ADMS] Raw punch data received from device SN: ${sn}`);
      console.log(`[ZKTeco Payload]:\n${body}`);

      let count = 0;
      const lines = body.split(/\r?\n/).filter(l => l.trim().length > 0);

      // Pre-fetch students to match roll number and PIN
      let students = [];
      try {
        const snap = await getDocs(collection(db, 'students'));
        snap.forEach(d => students.push({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('Error reading students from Firestore:', e.message);
      }

      for (const line of lines) {
        let userId = '';
        let timestamp = '';

        if (line.includes('USERID=') || line.includes('CHECKTIME=')) {
          const parts = line.split('\t');
          for (const p of parts) {
            const [k, v] = p.split('=');
            if (k === 'USERID' || k === 'PIN') userId = v?.trim();
            if (k === 'CHECKTIME') timestamp = v?.trim();
          }
        } else {
          const parts = line.split(/[\t\s]{2,}|\t/);
          if (parts.length >= 2) {
            userId = parts[0]?.trim();
            timestamp = parts[1]?.trim();
          }
        }

        if (userId && timestamp) {
          count++;
          const dateStr = timestamp.split(' ')[0] || new Date().toISOString().split('T')[0];
          const timeStr = timestamp.split(' ')[1] || new Date().toTimeString().split(' ')[0];

          // Match student by Roll, biometricPin, numeric PIN, or ID
          const cleanUser = userId.toLowerCase();
          const student = students.find(s => {
            const roll = (s.rollNumber || '').toLowerCase();
            const pin = (s.biometricPin || '').toLowerCase();
            const numRoll = roll.replace(/[^0-9]/g, '');
            const numUser = cleanUser.replace(/[^0-9]/g, '');
            return (
              roll === cleanUser || 
              pin === cleanUser || 
              s.id.toLowerCase() === cleanUser ||
              (numRoll && numUser && (numRoll === numUser || parseInt(numRoll, 10) === parseInt(numUser, 10) || numRoll.endsWith(numUser)))
            );
          });

          const studentId = student ? student.id : `zk_temp_${userId}`;
          const studentRoll = student ? student.rollNumber : `PIN-${userId}`;
          const studentName = student ? student.fullName : `Candidate PIN ${userId}`;
          const batch = student ? student.batch : 'Batch A (Morning 09:00 - 11:00)';

          const attDocId = `att_${studentId}_${dateStr}`;

          try {
            // Write attendance to Firestore
            await setDoc(doc(db, 'attendance', attDocId), {
              id: attDocId,
              studentId,
              studentRoll,
              studentName,
              batch,
              date: dateStr,
              time: timeStr,
              status: 'Present',
              source: 'zkteco_k40',
              deviceId: sn,
              remarks: `Present (Verified via ZKTeco K40 Fingerprint scan at ${timeStr})`
            }, { merge: true });

            console.log(`[ZKTeco ADMS] -> Attendance Present saved for ${studentName} (${studentRoll})`);

            // If candidate was 'Pending Verification', mark them 'Active'!
            if (student && (student.status === 'Pending Verification' || !student.biometricEnrolled)) {
              await updateDoc(doc(db, 'students', student.id), {
                status: 'Active',
                biometricEnrolled: true,
                zkDeviceId: sn,
                verificationDate: dateStr
              });
              console.log(`[ZKTeco ADMS] -> Candidate ${studentName} verified & activated in Firestore!`);
            }
          } catch (err) {
            console.error('Firestore write error:', err.message);
          }
        }
      }

      // Return OK to device so it acknowledges records
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`OK: ${count}`);
    });
    return;
  }

  // 3. Command Polling (GET /iclock/getrequest)
  if (pathname === '/iclock/getrequest' && method === 'GET') {
    const nextCmd = commandQueue.find(c => c.status === 'queued');
    if (nextCmd) {
      nextCmd.status = 'sent';
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(nextCmd.cmd);
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // 4. Command Execution Result (POST /iclock/devicecmd)
  if (pathname === '/iclock/devicecmd' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      console.log('[ZKTeco ADMS] Devicecmd result:', body);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    });
    return;
  }

  // 5. Default Route
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    service: 'OK Korean LMS - ZKTeco K40 ADMS Biometric Attendance Bridge',
    status: 'online',
    endpoint: '/iclock/cdata',
    connectedDevices: Array.from(connectedDevices.values())
  }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Bridge Server] Listening on http://0.0.0.0:${PORT}`);
  console.log(`[ADMS URL for K40] Configure device to point to: http://<YOUR_IP>:${PORT}/iclock/cdata`);
});
