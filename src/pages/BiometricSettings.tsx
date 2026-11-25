import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Wifi,
  WifiOff,
  Server,
  Save,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Fingerprint,
  ArrowLeftRight,
  Info,
  Radio,
  Zap,
  Clock,
  ShieldCheck,
  AlertCircle,
  SlidersHorizontal
} from 'lucide-react';
import { Student, ZKTecoDeviceConfig, ZKTecoPunchLog, BatchRecord } from '../types';
import { StorageService } from '../services/storageService';
import { AcademyDataService } from '../services/academyDataService';
import { ZKTecoListenerService } from '../services/zktecoListenerService';
import { SimulatePunchModal } from '../components/modals/SimulatePunchModal';
import { DeviceSettings } from '../components/DeviceSettings';
import { useAuth } from '../context/AuthContext';

export const BiometricSettings: React.FC = () => {
  const { user } = useAuth();
  const [deviceConfig, setDeviceConfig] = useState<ZKTecoDeviceConfig>(() =>
    StorageService.getDeviceConfig()
  );
  const [ip, setIp] = useState(deviceConfig.ip || '192.168.1.201');
  const [port, setPort] = useState(deviceConfig.port || 4370);
  const [sn, setSn] = useState(deviceConfig.sn || 'K40-ADMS-01');
  const [backendApiUrl, setBackendApiUrl] = useState(deviceConfig.backendApiUrl || '');
  const [backendUrlError, setBackendUrlError] = useState<string | null>(null);
  const [status, setStatus] = useState<'Connected' | 'Disconnected'>(
    deviceConfig.status || 'Disconnected'
  );
  const [autoSync, setAutoSync] = useState<boolean>(deviceConfig.autoSync ?? true);
  const [inOutModeEnabled, setInOutModeEnabled] = useState<boolean>(
    Boolean(deviceConfig.inOutModeEnabled)
  );
  const initialRules = StorageService.getAttendanceRules();
  const [morningLateTime, setMorningLateTime] = useState<string>(
    () => initialRules.morningLateTime || '08:00'
  );
  const [morningLateEnabled, setMorningLateEnabled] = useState<boolean>(
    () => Boolean(initialRules.morningLateEnabled)
  );
  const [eveningLateTime, setEveningLateTime] = useState<string>(
    () => initialRules.eveningLateTime || '17:00'
  );
  const [eveningLateEnabled, setEveningLateEnabled] = useState<boolean>(
    () => Boolean(initialRules.eveningLateEnabled)
  );
  const [isSavingLateRules, setIsSavingLateRules] = useState(false);

  const [students, setStudents] = useState<Student[]>(() => StorageService.getStudents());
  const [batches, setBatches] = useState<BatchRecord[]>(() => AcademyDataService.getBatches());
  const [livePunches, setLivePunches] = useState<ZKTecoPunchLog[]>([]);
  const [liveBridgeOnline, setLiveBridgeOnline] = useState<boolean>(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<string>('');
  const [totalServerPunches, setTotalServerPunches] = useState<number>(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSimulateModalOpen, setIsSimulateModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'guide'>('config');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    const unsubConfig = StorageService.subscribeDeviceConfig((cfg) => {
      setDeviceConfig(cfg);
      setIp(cfg.ip || '192.168.1.201');
      setPort(cfg.port || 4370);
      setSn(cfg.sn || 'K40-ADMS-01');
      setBackendApiUrl(cfg.backendApiUrl || '');
      setStatus(cfg.status || 'Disconnected');
      setAutoSync(cfg.autoSync ?? true);
      setInOutModeEnabled(Boolean(cfg.inOutModeEnabled));
    });
    const unsubStudents = StorageService.subscribeStudents(setStudents);
    const unsubBatches = AcademyDataService.subscribeBatches(setBatches);
    const unsubPunches = ZKTecoListenerService.subscribeLivePunches(setLivePunches, 20);
    const unsubRules = StorageService.subscribeAttendanceRules((rules) => {
      setMorningLateTime(rules.morningLateTime || '08:00');
      setMorningLateEnabled(Boolean(rules.morningLateEnabled));
      setEveningLateTime(rules.eveningLateTime || '17:00');
      setEveningLateEnabled(Boolean(rules.eveningLateEnabled));
    });

    return () => {
      unsubConfig();
      unsubStudents();
      unsubBatches();
      unsubPunches();
      unsubRules();
    };
  }, []);

  // Poll ADMS server bridge status
  const fetchBridgeStatus = async () => {
    try {
      const res = await fetch('/api/zkteco/status');
      if (!res.ok) return;
      const data = await res.json();
      setLiveBridgeOnline(Boolean(data.online) || data.status === 'Connected');
      if (data.devices?.[0]?.lastSeen) {
        setLastHeartbeat(data.devices[0].lastSeen);
      }
      if (typeof data.devices?.[0]?.totalPunches === 'number') {
        setTotalServerPunches(data.devices[0].totalPunches);
      }
    } catch {
      // Ignore transient poll errors
    }
  };

  useEffect(() => {
    fetchBridgeStatus();
    const timer = setInterval(fetchBridgeStatus, 15000);
    return () => clearInterval(timer);
  }, []);

  const currentHost =
    typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const bridgeEndpoint = `http://${currentHost}/iclock/cdata`;

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(bridgeEndpoint);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const validateBackendUrl = (value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed && !/^https?:\/\/.+/i.test(trimmed)) {
      return 'LMS Backend API URL must start with http:// or https:// (e.g., https://api.ok-korean.com/iclock/cdata)';
    }
    return null;
  };

  const handleSaveConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const urlError = validateBackendUrl(backendApiUrl);
    if (urlError) {
      setBackendUrlError(urlError);
      return;
    }
    setBackendUrlError(null);
    setIsSaving(true);
    try {
      await StorageService.updateDeviceConfig({
        ip: ip.trim(),
        port: Number(port) || 4370,
        sn: sn.trim() || 'K40-ADMS-01',
        backendApiUrl: backendApiUrl.trim(),
        status,
        autoSync,
        inOutModeEnabled,
      });
      showToast('ZKTeco device settings saved to Firebase.');
    } catch (err) {
      console.error('Failed to save device settings:', err);
      showToast('Failed to save device configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleConnection = async () => {
    setIsTesting(true);
    try {
      const nextStatus: 'Connected' | 'Disconnected' =
        status === 'Connected' ? 'Disconnected' : 'Connected';
      setStatus(nextStatus);
      await StorageService.updateDeviceConfig({ status: nextStatus });
      await fetchBridgeStatus();
      showToast(`ZKTeco device marked as ${nextStatus}.`);
    } catch {
      showToast('Could not reach ZKTeco bridge API.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleToggleInOutMode = async () => {
    const nextValue = !inOutModeEnabled;
    setInOutModeEnabled(nextValue);
    try {
      await StorageService.updateDeviceConfig({ inOutModeEnabled: nextValue });
      showToast(
        nextValue
          ? 'IN/OUT Mode ENABLED — 1st Punch: Yellow (IN), 2nd Punch: Green (OUT)'
          : 'IN/OUT Mode DISABLED — Standard single-punch mode (Green)'
      );
    } catch (err) {
      console.error('Failed to update IN/OUT mode:', err);
      showToast('Failed to update IN/OUT mode setting.');
    }
  };

  const handleSaveLateRules = async () => {
    setIsSavingLateRules(true);
    try {
      await StorageService.updateAttendanceRules(
        {
          morningLateTime,
          morningLateEnabled,
          eveningLateTime,
          eveningLateEnabled,
        },
        user?.name || 'Admin'
      );
      showToast('Morning & Evening Late Rules saved to Firebase.');
    } catch (err) {
      console.error('Failed to save Late Arrival Rules:', err);
      showToast('Failed to save Late Arrival Rules.');
    } finally {
      setIsSavingLateRules(false);
    }
  };

  const isConnected = status === 'Connected' || liveBridgeOnline;
  const todayDate = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ZKTeco K40 Device Settings Modal */}
      <DeviceSettings
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
      />

      {/* Simulate Fingerprint Punch Modal */}
      <SimulatePunchModal
        isOpen={isSimulateModalOpen}
        onClose={() => setIsSimulateModalOpen(false)}
        students={students}
        currentBatch={batches[0]?.name || ''}
        currentDate={todayDate}
        onSuccess={(name, roll) => {
          showToast(
            inOutModeEnabled
              ? `Biometric IN/OUT punch recorded for ${name} (${roll})!`
              : `Biometric punch recorded for ${name} (${roll})! Fingerprint turned Green.`
          );
        }}
      />

      {/* Top Live ZKTeco Connection Status Banner */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isConnected
            ? 'bg-emerald-500/10 dark:bg-emerald-950/30 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
            : 'bg-rose-500/10 dark:bg-rose-950/30 border-rose-500/25 text-rose-950 dark:text-rose-100'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`p-3 rounded-2xl shrink-0 border ${
                isConnected
                  ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-500 border-rose-500/30'
              }`}
            >
              {isConnected ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-black text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full inline-block ${
                      isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 animate-pulse'
                    }`}
                  />
                  <span>
                    ZKTeco Device: {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isConnected
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
                  }`}
                >
                  {isConnected ? 'Online' : 'Offline'}
                </span>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                  {ip}:{port} · SN: {sn}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Manage ZKTeco K40 hardware IP settings, ADMS cloud push endpoint, and real-time IN/OUT biometric punch behavior.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleToggleConnection}
              disabled={isTesting}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                isConnected
                  ? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-500 shadow-sm'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isConnected ? 'Disconnect Device' : 'Connect Device'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsDeviceModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition-all cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-300" />
              <span>Device Settings Modal</span>
            </button>

            <button
              type="button"
              onClick={() => setIsSimulateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
            >
              <Fingerprint className="w-4 h-4 text-emerald-300" />
              <span>Simulate Punch</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Device Configuration + IN/OUT Mode Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: IP Settings & Hardware Guide */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  ZKTeco Terminal Configuration
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Static LAN IP, ADMS port, and serial number synced with Firestore
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('config')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'config'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                IP & ADMS Settings
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Hardware Setup Guide
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'config' ? (
              <form onSubmit={handleSaveConfig} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Device IP Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={ip}
                      onChange={(e) => setIp(e.target.value)}
                      placeholder="192.168.1.201"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Port <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={port}
                      onChange={(e) => setPort(Number(e.target.value))}
                      placeholder="4370"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Device Serial Number (SN)
                    </label>
                    <input
                      type="text"
                      value={sn}
                      onChange={(e) => setSn(e.target.value)}
                      placeholder="K40-ADMS-01"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2.5 p-2.5 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoSync}
                        onChange={(e) => setAutoSync(e.target.checked)}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Enable Real-Time ADMS Auto-Sync
                      </span>
                    </label>
                  </div>
                </div>

                {/* ADMS Bridge URL Card */}
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      ADMS Bridge Cloud URL (Device Push Endpoint)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyEndpoint}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      {copiedEndpoint ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedEndpoint ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/60 font-mono text-xs text-indigo-700 dark:text-indigo-300 break-all select-all">
                    {bridgeEndpoint}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                    <span className="flex items-center gap-1.5">
                      <Radio className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Pushes sync directly to Firestore</span>
                    </span>
                    {lastHeartbeat && (
                      <span className="font-mono">
                        Last Heartbeat: {new Date(lastHeartbeat).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* LMS Backend API Endpoint (Server URL) */}
                <div>
                  <label
                    htmlFor="biometric-backend-api-url"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    LMS Backend API Endpoint (Server URL)
                  </label>
                  <input
                    id="biometric-backend-api-url"
                    type="text"
                    value={backendApiUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBackendApiUrl(val);
                      if (backendUrlError) {
                        setBackendUrlError(validateBackendUrl(val));
                      }
                    }}
                    placeholder="e.g., https://api.ok-korean.com/iclock/cdata"
                    className={`w-full px-3.5 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 ${
                      backendUrlError
                        ? 'border-rose-500 focus:ring-rose-500'
                        : 'border-slate-300 dark:border-slate-700 focus:ring-indigo-500'
                    }`}
                  />
                  {backendUrlError ? (
                    <p className="text-[11px] text-rose-500 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{backendUrlError}</span>
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                      Must start with <span className="font-mono">http://</span> or <span className="font-mono">https://</span>.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={fetchBridgeStatus}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Test Bridge Connection</span>
                  </button>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>Save Device Configuration</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p>
                    Follow these steps on your physical ZKTeco K40 terminal keyboard to link it with the LMS ADMS receiver:
                  </p>
                </div>
                <ol className="space-y-3 list-decimal list-inside font-medium">
                  <li className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <strong className="text-slate-900 dark:text-white">Set Static Ethernet IP</strong>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 pl-4">
                      Press <strong>M/OK</strong> &rarr; <strong>Comm.</strong> &rarr; <strong>Ethernet</strong> &rarr; Set IP to{' '}
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{ip}</span>.
                    </p>
                  </li>
                  <li className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <strong className="text-slate-900 dark:text-white">Configure Cloud Server (ADMS)</strong>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 pl-4">
                      Press <strong>M/OK</strong> &rarr; <strong>Comm.</strong> &rarr; <strong>Cloud Server Setting</strong>: set Server Address to your host &amp; Port to <strong>3000</strong>.
                    </p>
                  </li>
                  <li className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                    <strong className="text-slate-900 dark:text-white">Real-Time Verification</strong>
                    <p className="mt-1 text-slate-500 dark:text-slate-400 pl-4">
                      Scans push to <span className="font-mono text-indigo-600 dark:text-indigo-400">/iclock/cdata</span> and immediately update Student Directory fingerprint colors via Firebase.
                    </p>
                  </li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Late Arrival Time Rule + IN/OUT Mode Toggle & Fingerprint Legend */}
        <div className="space-y-6">
          {/* Attendance Timing Rule Card (Morning & Evening + Neutral Mode) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl border bg-amber-500/15 text-amber-500 border-amber-500/30">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Attendance Timing Rule
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Separate Morning &amp; Evening late cutoffs (OFF = Neutral Mode)
                  </p>
                </div>
              </div>
            </div>

            {/* Morning Late Time */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="morning-late-time-input"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  Morning Late Time
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Enable Late Rule
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={morningLateEnabled}
                    aria-label="Enable Morning Late Rule"
                    onClick={() => setMorningLateEnabled((prev) => !prev)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                      morningLateEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                        morningLateEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>

              <input
                id="morning-late-time-input"
                type="time"
                value={morningLateTime}
                disabled={!morningLateEnabled}
                onChange={(e) => setMorningLateTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {morningLateEnabled ? (
                  <>Morning punches after <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{morningLateTime}</span> mark <strong>Late</strong>.</>
                ) : (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Neutral Mode (OFF) — All Morning punches marked Present regardless of time.
                  </span>
                )}
              </p>
            </div>

            {/* Evening Late Time */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="evening-late-time-input"
                  className="text-xs font-bold text-slate-800 dark:text-slate-200"
                >
                  Evening Late Time
                </label>

                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Enable Late Rule
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={eveningLateEnabled}
                    aria-label="Enable Evening Late Rule"
                    onClick={() => setEveningLateEnabled((prev) => !prev)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-hidden ${
                      eveningLateEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                        eveningLateEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              </div>

              <input
                id="evening-late-time-input"
                type="time"
                value={eveningLateTime}
                disabled={!eveningLateEnabled}
                onChange={(e) => setEveningLateTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 disabled:opacity-50 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {eveningLateEnabled ? (
                  <>Evening punches after <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{eveningLateTime}</span> mark <strong>Late</strong>.</>
                ) : (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    Neutral Mode (OFF) — All Evening punches marked Present regardless of time.
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveLateRules}
              disabled={isSavingLateRules}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              {isSavingLateRules ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Attendance Timing Rules</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl border ${
                    inOutModeEnabled
                      ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                  }`}
                >
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Enable IN/OUT Mode
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Two-punch check-in &amp; check-out tracking
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={inOutModeEnabled}
                onClick={handleToggleInOutMode}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  inOutModeEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                title="Toggle Enable IN/OUT Mode"
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition duration-200 ease-in-out ${
                    inOutModeEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                inOutModeEnabled
                  ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                  : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
              }`}
            >
              {inOutModeEnabled ? (
                <div className="space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>IN/OUT Mode is ON</span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    First fingerprint punch marks the student as <strong>IN</strong> (Yellow icon). Second punch on the same day marks them <strong>OUT</strong> (Green icon).
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Standard Single-Punch Mode (OFF)</span>
                  </div>
                  <p className="text-[11px] opacity-90">
                    First fingerprint punch marks the student as <strong>Present</strong> and turns their Student Directory fingerprint icon <strong>Green</strong> immediately.
                  </p>
                </div>
              )}
            </div>

            {/* 3-Color Legend */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Student Directory Icon States
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                <span className="p-1.5 rounded-lg bg-red-500/15 text-red-500 border border-red-500/25">
                  <Fingerprint className="w-4 h-4" />
                </span>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Red</span>
                  <span className="text-slate-500 dark:text-slate-400"> — Not punched in today</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                <span className="p-1.5 rounded-lg bg-yellow-500/15 text-yellow-500 border border-yellow-500/30">
                  <Fingerprint className="w-4 h-4" />
                </span>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Yellow</span>
                  <span className="text-slate-500 dark:text-slate-400"> — Punched IN (IN/OUT Mode ON)</span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 text-xs">
                <span className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                  <Fingerprint className="w-4 h-4" />
                </span>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white">Green</span>
                  <span className="text-slate-500 dark:text-slate-400"> — Punched OUT (or Present if OFF)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Biometric Punch Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Live ZKTeco Punch Stream
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 tabular-nums">
              {Math.max(livePunches.length, totalServerPunches)} events
            </span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Synced via Firebase real-time listener
          </span>
        </div>

        {livePunches.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            No biometric punches recorded yet. Scan a finger on the terminal or click <strong>Simulate Punch</strong> above to test.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Roll No</th>
                  <th className="py-2.5 px-4">Date &amp; Time</th>
                  <th className="py-2.5 px-4">Punch Mode</th>
                  <th className="py-2.5 px-4">Device</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {livePunches.map((punch) => {
                  const isInYellow = punch.punchState === 'in' || punch.punchType === 'IN';
                  const isOutGreen = punch.punchState === 'out' || punch.punchType === 'OUT';
                  return (
                    <tr key={punch.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-white">
                        {punch.studentName || `PIN ${punch.userId}`}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-cyan-600 dark:text-cyan-400">
                        {punch.studentRoll || punch.userId}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {punch.date} {punch.time}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isInYellow
                                ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
                                : isOutGreen
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            <Fingerprint className="w-3 h-3" />
                            <span>
                              {isInYellow ? 'Punch IN' : isOutGreen ? 'Punch OUT' : 'Present'}
                            </span>
                          </span>
                          {punch.status === 'Late' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              Late
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                        {punch.deviceId || sn}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiometricSettings;
