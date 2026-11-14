import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Clock, 
  Cloud, 
  CloudOff, 
  Download, 
  LogOut, 
  User, 
  Settings, 
  CheckCircle2,
  Users,
  Briefcase,
  UserCheck,
  ShieldAlert
} from 'lucide-react';
import { exportToExcel } from '../services/storage';

export default function Navbar({ 
  currentUser, 
  onLogout, 
  activeView, 
  setActiveView, 
  cases, 
  users, 
  onOpenSettings,
  isCloudConnected 
}) {
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('th-TH', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    exportToExcel(cases, users);
  };

  const isLeader = currentUser?.role === 'leader';

  return (
    <header className="sticky top-0 z-40 bg-[#0A1224]/95 backdrop-blur-md border-b border-[#1E2E54] shadow-md shadow-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Pure Standalone TCSD Emblem without background box */}
          <div className="flex items-center gap-3">
            <div className="shrink-0 cursor-pointer">
              <img 
                src="/tcsd-logo.png" 
                alt="TCSD Logo" 
                className="h-10 sm:h-11 w-auto object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)] hover:scale-105 transition-transform"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden h-10 w-10 rounded-lg bg-blue-950 border border-amber-400 items-center justify-center text-amber-400 font-bold text-xs">
                TCSD
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-['Chakra_Petch'] text-[10px] font-semibold tracking-wider text-amber-400 uppercase flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                  CIB • TCSD POLICE
                </span>
                <span className="text-[9px] bg-blue-900/60 text-blue-300 px-1.5 py-0.2 rounded border border-blue-700/50 font-mono">
                  บก.ปอท.
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                Case Tracker by TCSD2 กก.2 บก.ปอท.
              </h1>
            </div>
          </div>

          {/* Center: View Switcher */}
          <div className="hidden md:flex items-center bg-[#070D1E] p-1 rounded-xl border border-[#1E2E54]">
            {isLeader && (
              <button
                onClick={() => setActiveView('leader')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeView === 'leader'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>ภาพรวมหัวหน้าทีม</span>
              </button>
            )}

            <button
              onClick={() => setActiveView('member')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'member'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>{isLeader ? 'งานทีม / ส่วนตัว' : 'งานของฉัน & สรุปทีม'}</span>
            </button>

            <button
              onClick={() => setActiveView('operations')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'operations'
                  ? 'bg-indigo-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>เคสคดี & สถิติ</span>
            </button>

            <button
              onClick={() => setActiveView('personnel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'personnel'
                  ? 'bg-cyan-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>กำลังพล</span>
            </button>

            <button
              onClick={() => setActiveView('arrests')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'arrests'
                  ? 'bg-red-600 text-white font-bold shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>การจับกุม</span>
            </button>
          </div>

          {/* Right: Actions, Sync, User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Clock */}
            <div className="hidden xl:flex items-center gap-1.5 text-[11px] font-mono text-slate-400 bg-[#0C152B] px-2.5 py-1 rounded-lg border border-[#1E2E54]">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{currentTime}</span>
            </div>

            {/* Cloud Status */}
            <button
              onClick={onOpenSettings}
              title="ตั้งค่าเชื่อมต่อฐานข้อมูล Cloud / LAN"
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                isCloudConnected
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-blue-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20'
              }`}
            >
              {isCloudConnected ? <Cloud className="w-3 h-3" /> : <CloudOff className="w-3 h-3" />}
              <span className="hidden sm:inline">
                {isCloudConnected ? 'Cloud Online' : 'Local Ready'}
              </span>
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExport}
              title="ส่งออกรายงานเป็น Excel"
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/30 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              title="ตั้งค่าระบบ"
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800/60 transition"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#1E2E54]">
              <div className="text-right hidden sm:block">
                <div className="text-xs font-bold text-white flex items-center justify-end gap-1">
                  <span>{currentUser?.name || 'เจ้าหน้าที่'}</span>
                  {isLeader && (
                    <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1 rounded border border-amber-400/40 font-bold">
                      หัวหน้า
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400">{currentUser?.rank || 'บก.ปอท.'}</div>
              </div>

              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-700 to-blue-900 border border-amber-400/40 flex items-center justify-center text-sm shadow-inner">
                {currentUser?.avatar || '👮‍♂️'}
              </div>

              <button
                onClick={onLogout}
                title="ออกจากระบบ"
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

        </div>

        {/* Mobile View Switcher */}
        <div className="flex md:hidden items-center justify-center gap-1.5 py-1.5 border-t border-[#1E2E54] overflow-x-auto">
          {isLeader && (
            <button
              onClick={() => setActiveView('leader')}
              className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition whitespace-nowrap ${
                activeView === 'leader'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800/60 text-slate-300'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>หัวหน้า</span>
            </button>
          )}
          <button
            onClick={() => setActiveView('member')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition whitespace-nowrap ${
              activeView === 'member'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-slate-800/60 text-slate-300'
            }`}
          >
            <Briefcase className="w-3 h-3" />
            <span>งาน</span>
          </button>
          <button
            onClick={() => setActiveView('personnel')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition whitespace-nowrap ${
              activeView === 'personnel'
                ? 'bg-cyan-600 text-white font-bold'
                : 'bg-slate-800/60 text-slate-300'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            <span>กำลังพล</span>
          </button>
          <button
            onClick={() => setActiveView('operations')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition whitespace-nowrap ${
              activeView === 'operations'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-800/60 text-slate-300'
            }`}
          >
            <Briefcase className="w-3 h-3" />
            <span>เคสคดี</span>
          </button>

          <button
            onClick={() => setActiveView('arrests')}
            className={`flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition whitespace-nowrap ${
              activeView === 'arrests'
                ? 'bg-red-600 text-white font-bold'
                : 'bg-slate-800/60 text-slate-300'
            }`}
          >
            <ShieldAlert className="w-3 h-3" />
            <span>จับกุม</span>
          </button>
        </div>

      </div>
    </header>
  );
}
