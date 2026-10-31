import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Wifi, 
  WifiOff, 
  Server, 
  Save, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Sliders, 
  Terminal, 
  Info, 
  Radio
} from 'lucide-react';
import { ZKTecoDeviceConfig } from '../types';
import { StorageService } from '../services/storageService';

interface DeviceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceSettings: React.FC<DeviceSettingsProps> = ({ isOpen, onClose }) => {
  const [deviceConfig, setDeviceConfig] = useState<ZKTecoDeviceConfig>(() => StorageService.getDeviceConfig());
  const [ip, setIp] = useState(deviceConfig.ip || '192.168.1.201');
  const [port, setPort] = useState(deviceConfig.port || 4370);
  const [sn, setSn] = useState(deviceConfig.sn || 'K40-ADMS-01');
  const [status, setStatus] = useState<'Connected' | 'Disconnected'>(deviceConfig.status || 'Disconnected');
  const [autoSync, setAutoSync] = useState(deviceConfig.autoSync ?? true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'guide'>('config');

  useEffect(() => {
    return StorageService.subscribeDeviceConfig((cfg) => {
      setDeviceConfig(cfg);
      setIp(cfg.ip);
      setPort(cfg.port);
      setSn(cfg.sn);
      setStatus(cfg.status);
      setAutoSync(cfg.autoSync ?? true);
    });
  }, []);

  if (!isOpen) return null;

  const currentHost = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const bridgeEndpoint = `http://${currentHost}/iclock/cdata`;

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(bridgeEndpoint);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await StorageService.updateDeviceConfig({
        ip: ip.trim(),
        port: Number(port),
        sn: sn.trim(),
        status,
        autoSync
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save device settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const res = await fetch('/api/zkteco/status');
      const data = await res.json();
      if (data) {
        // Toggle or set connected state
        const newStatus: 'Connected' | 'Disconnected' = status === 'Connected' ? 'Disconnected' : 'Connected';
        setStatus(newStatus);
        await StorageService.updateDeviceConfig({ status: newStatus });
      }
    } catch {
      setStatus(prev => prev === 'Connected' ? 'Disconnected' : 'Connected');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-indigo-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">ZKTeco K40 Device Settings</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                  status === 'Connected' 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-slate-700 text-slate-300 border border-slate-600'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${status === 'Connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                  {status}
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                Hardware IP configuration, ADMS Cloud Bridge & Firestore Sync
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-3 shrink-0 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={() => setActiveTab('config')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'config'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Configuration & IP
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'guide'
                ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Hardware Menu Setup Guide
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === 'config' ? (
            <form onSubmit={handleSave} className="space-y-4">
              {saveSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Device settings saved to Cloud Firestore successfully!</span>
                </div>
              )}

              {/* IP Address & Port Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    ZKTeco Device IP Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    placeholder="192.168.1.201"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Static IP assigned to the K40 biometric terminal on local network.
                  </p>
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
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Default: 4370</p>
                </div>
              </div>

              {/* Device Serial Number */}
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

              {/* Bridge Server ADMS Push Endpoint */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    ADMS Bridge Cloud URL (Enter into Device Menu)
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyEndpoint}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    {copiedEndpoint ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedEndpoint ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/60 font-mono text-xs text-indigo-700 dark:text-indigo-300 break-all select-all">
                  {bridgeEndpoint}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  ZKTeco K40 devices push live biometric scan records directly to this endpoint via HTTP POST.
                </p>
              </div>

              {/* Status & Options */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="autoSyncCheck"
                    checked={autoSync}
                    onChange={(e) => setAutoSync(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="autoSyncCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    Enable Real-time ADMS Firestore Auto-sync
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>Toggle Device Status ({status})</span>
                </button>
              </div>

              {/* Save Footer Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>Save Device Configuration to Firestore</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Follow these 3 steps on your physical ZKTeco K40 device keyboard once the hardware arrives:
                </p>
              </div>

              <ol className="space-y-3 list-decimal list-inside font-medium">
                <li className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-white">Step 1: Set Ethernet IP Address</strong>
                  <p className="mt-1 text-slate-500 dark:text-slate-400 pl-4">
                    Press <strong>M/OK</strong> &rarr; <strong>Comm.</strong> &rarr; <strong>Ethernet</strong> &rarr; Set IP to <span className="font-mono text-indigo-600 dark:text-indigo-400 font-bold">{ip}</span>. Subnet: 255.255.255.0.
                  </p>
                </li>

                <li className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-white">Step 2: Configure Cloud Server (ADMS)</strong>
                  <p className="mt-1 text-slate-500 dark:text-slate-400 pl-4">
                    Press <strong>M/OK</strong> &rarr; <strong>Comm.</strong> &rarr; <strong>Cloud Server Setting</strong> (or ADMS/Webserver):<br />
                    &bull; Enable Domain Name: <strong>OFF</strong><br />
                    &bull; Server Address: <strong>[Your Server IP]</strong><br />
                    &bull; Server Port: <strong>3000</strong>
                  </p>
                </li>

                <li className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <strong className="text-slate-900 dark:text-white">Step 3: Verification & Punching</strong>
                  <p className="mt-1 text-slate-500 dark:text-slate-400 pl-4">
                    When students place their finger on the sensor, K40 validates the biometric template and instantly sends the timestamp to <span className="font-mono text-indigo-600 dark:text-indigo-400">/iclock/cdata</span>, which syncs directly to Firestore!
                  </p>
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Radio className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            <span>Port: {port} · SN: {sn}</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
