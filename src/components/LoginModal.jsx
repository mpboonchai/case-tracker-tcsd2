import React, { useState } from 'react';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { getSettings } from '../services/storage';

export default function LoginModal({ isOpen, onLogin, users }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const settings = getSettings();
      if (settings.useCloudServer && settings.serverUrl) {
        try {
          const res = await fetch(`${settings.serverUrl.replace(/\/$/, '')}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username.trim(), password })
          });
          const data = await res.json();
          if (res.ok && data.success && data.user) {
            onLogin(data.user);
            return;
          }
          if (res.status === 401) {
            setError(data.error || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
            return;
          }
        } catch {
          // Fall back to local credentials if server unreachable
        }
      }

      const matchedUser = users.find(
        u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
      );

      if (matchedUser) {
        onLogin(matchedUser);
      } else {
        setError('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      
      <div className="relative w-full max-w-sm sm:max-w-md bg-[#0A1224] border border-blue-900/80 rounded-2xl shadow-2xl shadow-blue-950/80 overflow-hidden">
        
        {/* Top Glow Bar */}
        <div className="h-1 bg-gradient-to-r from-amber-500 via-blue-500 to-amber-400"></div>

        <div className="p-5 sm:p-6 space-y-4 sm:space-y-5">
          
          {/* Unit Branding Header (Clean standalone Logo) */}
          <div className="text-center space-y-1.5">
            <div className="inline-block mb-1">
              <img 
                src="/tcsd-logo.png" 
                alt="TCSD Logo" 
                className="h-16 w-auto mx-auto object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="hidden h-14 w-14 mx-auto rounded-xl bg-blue-950 border border-amber-400 items-center justify-center text-amber-400 font-bold text-sm">
                TCSD
              </div>
            </div>

            <div className="font-['Chakra_Petch'] text-[10px] font-bold tracking-widest text-amber-400 uppercase">
              CIB • POLICE CYBER INVESTIGATION
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Case Tracker by TCSD2 กก.2 บก.ปอท.
            </h2>
            <p className="text-[11px] text-slate-400">
              กองบังคับการปราบปรามการกระทำความผิดเกี่ยวกับอาชญากรรมทางเทคโนโลยี (บก.ปอท.)
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-2.5 bg-red-950/50 border border-red-500/40 rounded-lg text-xs text-red-300 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                ชื่อผู้ใช้งาน (Username)
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="leader หรือ somchai"
                  className="w-full pl-9 pr-3 py-2 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                รหัสผ่าน (Password)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-lg text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <span>{isSubmitting ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ (Sign In)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </form>

          <p className="text-[10px] text-slate-500 text-center pt-1 border-t border-[#1E2E54]">
            ระบบเฉพาะเจ้าหน้าที่ กก.2 บก.ปอท. (CIB)
          </p>

        </div>

      </div>
    </div>
  );
}
