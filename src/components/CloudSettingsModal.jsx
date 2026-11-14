import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  Server, 
  Save, 
  Download, 
  Upload, 
  RotateCcw, 
  AlertCircle,
  Wifi,
  ExternalLink,
  Database
} from 'lucide-react';
import { getSettings, saveSettings } from '../services/storage';
import { INITIAL_CASES, INITIAL_USERS, DEFAULT_GOOGLE_CONFIG } from '../data/initialData';

export default function CloudSettingsModal({ 
  isOpen, 
  onClose, 
  cases, 
  onUpdateCases,
  isCloudConnected 
}) {
  const [settings, setSettingsState] = useState(getSettings());
  const [serverUrl, setServerUrl] = useState('');
  const [useCloudServer, setUseCloudServer] = useState(false);
  const [googleSheetId, setGoogleSheetId] = useState(DEFAULT_GOOGLE_CONFIG.spreadsheetId);
  const [driveFolderId, setDriveFolderId] = useState(DEFAULT_GOOGLE_CONFIG.driveFolderId);
  const [statusMessage, setStatusMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getSettings();
      setSettingsState(current);
      setServerUrl(current.serverUrl || 'http://localhost:5000/api');
      setUseCloudServer(!!current.useCloudServer);
      setGoogleSheetId(current.googleConfig?.spreadsheetId || DEFAULT_GOOGLE_CONFIG.spreadsheetId);
      setDriveFolderId(current.googleConfig?.driveFolderId || DEFAULT_GOOGLE_CONFIG.driveFolderId);
      setStatusMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveSettings = () => {
    const updated = {
      ...settings,
      serverUrl: serverUrl.trim(),
      useCloudServer,
      googleConfig: {
        spreadsheetId: googleSheetId.trim(),
        driveFolderId: driveFolderId.trim()
      }
    };
    saveSettings(updated);
    setSettingsState(updated);
    setStatusMessage('บันทึกการตั้งค่าเรียบร้อยแล้ว');
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMessage('');
    try {
      const url = serverUrl.trim().replace(/\/$/, '');
      const res = await fetch(`${url}/status`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        setStatusMessage(`เชื่อมต่อสำเร็จ! (${data.service || 'ONLINE'})`);
      } else {
        setStatusMessage(`เชื่อมต่อไม่ได้ (รหัส: ${res.status})`);
      }
    } catch (err) {
      setStatusMessage(`ไม่สามารถเชื่อมต่อ: ${err.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      cases,
      users: INITIAL_USERS
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TCSD_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.cases && Array.isArray(parsed.cases)) {
          onUpdateCases(parsed.cases);
          setStatusMessage(`กู้คืนข้อมูลสำเร็จ (${parsed.cases.length} คดี)`);
        } else {
          alert('รูปแบบไฟล์ข้อมูลสำรองไม่ถูกต้อง');
        }
      } catch (err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleResetData = () => {
    if (confirm('คุณต้องการรีเซ็ตข้อมูลคดีทั้งหมดกลับเป็นค่าเริ่มต้นตัวอย่าง ปอท. ใช่หรือไม่?')) {
      onUpdateCases(INITIAL_CASES);
      setStatusMessage('รีเซ็ตข้อมูลกลับเป็นค่าเริ่มต้นแล้ว');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0B142B] border border-blue-900/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-4 py-3 bg-[#080E1E] border-b border-[#1E2E54] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white">
                ตั้งค่าระบบคลาวด์และสำรองข้อมูล (Cloud & Backup)
              </h2>
              <p className="text-[10px] text-slate-400">
                ซิงค์ข้อมูลระหว่างเครื่องผ่าน LAN / Cloud
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          
          {statusMessage && (
            <div className={`p-2.5 rounded-lg text-xs flex items-center gap-1.5 border ${
              statusMessage.includes('สำเร็จ') 
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300' 
                : 'bg-amber-950/60 border-amber-500/40 text-amber-300'
            }`}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Section 1: Server Config */}
          <div className="p-3 rounded-lg bg-[#070D1E] border border-blue-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                  เซิร์ฟเวอร์กลาง (Cloud / LAN Server)
                </span>
              </div>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                isCloudConnected 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {isCloudConnected ? 'ONLINE' : 'LOCAL'}
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useCloudServer}
                onChange={(e) => setUseCloudServer(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 bg-slate-800 border-slate-700"
              />
              <span className="text-xs font-semibold text-slate-200">
                เปิดใช้งานการซิงค์ข้อมูลกับ Cloud / LAN Server
              </span>
            </label>

            {useCloudServer && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-[11px] text-slate-300">
                  URL เซิร์ฟเวอร์ API (เช่น http://192.168.1.50:5000/api)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="http://localhost:5000/api"
                    className="flex-1 px-2.5 py-1.5 bg-[#0A1224] rounded-lg border border-slate-700 text-xs text-cyan-300 font-mono focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting}
                    className="px-2.5 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <Wifi className="w-3 h-3" />
                    <span>{isTesting ? '...' : 'ทดสอบ'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleSaveSettings}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer"
              >
                <Save className="w-3 h-3" />
                <span>บันทึก</span>
              </button>
            </div>
          </div>

          {/* Section 1.5: Google Sheet & Drive Config */}
          <div className="p-3 rounded-lg bg-[#070D1E] border border-blue-900/50 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                ฐานข้อมูล Google Sheet & Google Drive อ้างอิง
              </span>
            </div>
            <div className="space-y-2 text-[11px]">
              <div>
                <div className="flex items-center justify-between text-slate-300 mb-1">
                  <span>Google Sheet ID (TCSD2_TEAM)</span>
                  {googleSheetId && (
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${googleSheetId}/edit`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>เปิด Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={googleSheetId}
                  onChange={(e) => setGoogleSheetId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0A1224] rounded-lg border border-slate-700 text-xs text-emerald-300 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-slate-300 mb-1">
                  <span>Google Drive Folder ID</span>
                  {driveFolderId && (
                    <a
                      href={`https://drive.google.com/drive/folders/${driveFolderId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>เปิด Drive</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#0A1224] rounded-lg border border-slate-700 text-xs text-cyan-300 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Backup & Restore */}
          <div className="p-3 rounded-lg bg-[#070D1E] border border-blue-900/50 space-y-2.5">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>สำรองและกู้คืนฐานข้อมูล (Backup & Restore)</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleExportBackup}
                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-blue-950/60 hover:bg-blue-900/60 text-blue-200 border border-blue-800/50 text-xs font-bold transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>ดาวน์โหลดสำรอง (JSON)</span>
              </button>

              <label className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-200 border border-emerald-800/50 text-xs font-bold transition cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>กู้คืนข้อมูลสำรอง</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportBackup}
                  className="hidden"
                />
              </label>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[11px]">
              <span className="text-slate-400">รีเซ็ตข้อมูลคดีตัวอย่าง ปอท.</span>
              <button
                type="button"
                onClick={handleResetData}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-950/50 text-red-300 border border-red-800/60 hover:bg-red-900/50 transition font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>รีเซ็ต</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#080E1E] border-t border-[#1E2E54] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
          >
            ปิด
          </button>
        </div>

      </div>
    </div>
  );
}
