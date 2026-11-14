import React from 'react';
import { 
  FolderKanban, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  Inbox, 
  SearchCheck,
  Building2,
  UserCheck
} from 'lucide-react';
import { getDeadlineStatus } from '../services/storage';

export default function DashboardOverview({ cases, users, onSelectOfficerFilter }) {
  const totalCases = cases.length;
  
  const completedCases = cases.filter(
    c => c.status === 'completed' || (c.check1_requested && c.check2_received && c.check3_verified)
  ).length;

  const inProgressCases = cases.filter(
    c => c.status === 'in_progress' && !(c.check1_requested && c.check2_received && c.check3_verified)
  ).length;

  const waitingAgencyCases = cases.filter(
    c => (c.status === 'waiting_agency' || (c.check1_requested && !c.check2_received)) && 
         c.status !== 'completed'
  ).length;

  const overdueCases = cases.filter(c => {
    if (c.status === 'completed' || (c.check1_requested && c.check2_received && c.check3_verified)) return false;
    const status = getDeadlineStatus(c.deadline);
    return status.type === 'overdue';
  }).length;

  // 3-Step Verification Metrics
  const step1Count = cases.filter(c => c.check1_requested).length;
  const step2Count = cases.filter(c => c.check2_received).length;
  const step3Count = cases.filter(c => c.check3_verified).length;

  const step1Pct = totalCases > 0 ? Math.round((step1Count / totalCases) * 100) : 0;
  const step2Pct = totalCases > 0 ? Math.round((step2Count / totalCases) * 100) : 0;
  const step3Pct = totalCases > 0 ? Math.round((step3Count / totalCases) * 100) : 0;

  // Workload by Officer
  const workloadByOfficer = users
    .filter(u => u.role === 'investigator' || u.role === 'leader')
    .map(user => {
      const userCases = cases.filter(c => c.assignedTo === user.id);
      const userCompleted = userCases.filter(
        c => c.status === 'completed' || (c.check1_requested && c.check2_received && c.check3_verified)
      ).length;
      const userOverdue = userCases.filter(c => {
        if (c.status === 'completed' || (c.check1_requested && c.check2_received && c.check3_verified)) return false;
        return getDeadlineStatus(c.deadline).type === 'overdue';
      }).length;

      return {
        ...user,
        total: userCases.length,
        completed: userCompleted,
        pending: userCases.length - userCompleted,
        overdue: userOverdue,
        rate: userCases.length > 0 ? Math.round((userCompleted / userCases.length) * 100) : 0
      };
    });

  // Top Target Agencies pending
  const agencyCountMap = {};
  cases.forEach(c => {
    if (c.targetAgency && (!c.check2_received || !c.check3_verified)) {
      const agencies = c.targetAgency.split(',').map(a => a.trim());
      agencies.forEach(agency => {
        if (agency) {
          agencyCountMap[agency] = (agencyCountMap[agency] || 0) + 1;
        }
      });
    }
  });

  const sortedAgencies = Object.entries(agencyCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-5">
      
      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        
        {/* Total Cases */}
        <div className="cyber-card p-3.5 rounded-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">คดีทั้งหมด</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <FolderKanban className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {totalCases}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            สำนวนคดีในทีม
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-400 opacity-60"></div>
        </div>

        {/* In Progress */}
        <div className="cyber-card p-3.5 rounded-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">กำลังสืบสวน</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-400 font-mono">
            {inProgressCases}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            รวบรวมพยานหลักฐาน
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-500 opacity-70"></div>
        </div>

        {/* Waiting for Agency */}
        <div className="cyber-card p-3.5 rounded-xl relative overflow-hidden group">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider">รอผลหน่วยงาน</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {waitingAgencyCases}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ธนาคาร / ค่ายมือถือ / บัญชีม้า
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 opacity-80"></div>
        </div>

        {/* Overdue Alert */}
        <div className={`cyber-card p-3.5 rounded-xl relative overflow-hidden group ${
          overdueCases > 0 ? 'border-red-500/40 bg-red-950/20 pulse-critical' : ''
        }`}>
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-400">เกินกำหนด</span>
            <div className="p-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/30">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-400 font-mono">
            {overdueCases}
          </div>
          <div className="text-[10px] text-red-300/80 mt-0.5">
            {overdueCases > 0 ? 'ต้องเร่งรัดติดตามทันที' : 'ไม่มีคดีเกินกำหนด'}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500"></div>
        </div>

        {/* Completed */}
        <div className="cyber-card p-3.5 rounded-xl relative overflow-hidden group col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">เสร็จสิ้นสมบูรณ์</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {completedCases}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            ตรวจหลักฐานครบ 100%
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 opacity-80"></div>
        </div>

      </div>

      {/* 3-Step Verification Pipeline Funnel */}
      <div className="cyber-card p-4 rounded-xl border border-blue-900/60 bg-gradient-to-b from-[#0C162E] to-[#080E1E]">
        <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#1E2E54]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
            <h3 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
              <span>กระบวนการติดตามข้อมูลคดี 3 ขั้นตอน (3-Step Investigation Tracking)</span>
            </h3>
          </div>
          <span className="text-[10px] text-slate-400 font-mono bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">
            เกณฑ์มาตรฐาน บก.ปอท.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Step 1 */}
          <div className="bg-[#091124] p-3 rounded-lg border border-blue-800/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/50">
                <Send className="w-3 h-3" />
                1. ขอข้อมูลแล้ว
              </span>
              <span className="font-mono text-xs font-bold text-blue-300">
                {step1Count}/{totalCases} ({step1Pct}%)
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mb-2">
              ออกหนังสือราชการไปยังหน่วยงานภายนอก
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${step1Pct}%` }}
              ></div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-[#091124] p-3 rounded-lg border border-amber-800/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-700/50">
                <Inbox className="w-3 h-3" />
                2. ได้รับแล้ว
              </span>
              <span className="font-mono text-xs font-bold text-amber-300">
                {step2Count}/{totalCases} ({step2Pct}%)
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mb-2">
              ได้รับเอกสาร รายการเดินบัญชี หรือ Log จากหน่วยงาน
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${step2Pct}%` }}
              ></div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-[#091124] p-3 rounded-lg border border-emerald-800/40">
            <div className="flex items-center justify-between mb-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50">
                <SearchCheck className="w-3 h-3" />
                3. ตรวจสอบข้อมูลแล้ว
              </span>
              <span className="font-mono text-xs font-bold text-emerald-300">
                {step3Count}/{totalCases} ({step3Pct}%)
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mb-2">
              วิเคราะห์หลักฐานและนำเข้าสำนวนเรียบร้อย
            </p>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${step3Pct}%` }}
              ></div>
            </div>
          </div>

        </div>
      </div>

      {/* Two columns: Workload allocation + Waiting Agencies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        
        {/* Officer Workload */}
        <div className="lg:col-span-2 cyber-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1E2E54]">
            <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>ภาระงานของทีมสืบสวน (Investigator Workload)</span>
            </h4>
            <span className="text-[10px] text-slate-400">คลิกชื่อเพื่อกรองรายคน</span>
          </div>

          <div className="space-y-2.5">
            {workloadByOfficer.map((officer) => (
              <div 
                key={officer.id}
                onClick={() => onSelectOfficerFilter && onSelectOfficerFilter(officer.id)}
                className="p-2.5 rounded-lg bg-[#091124] hover:bg-[#101F3D] border border-blue-900/40 hover:border-amber-400/40 cursor-pointer transition"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{officer.avatar || '👮‍♂️'}</span>
                    <div>
                      <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
                        <span>{officer.name}</span>
                        <span className="text-[9px] text-slate-400 font-mono">({officer.badge})</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{officer.rank}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-300 text-[11px]">
                      คดี: <strong className="text-white">{officer.total}</strong>
                    </span>
                    <span className="text-emerald-400 text-[11px]">
                      เสร็จ: <strong>{officer.completed}</strong>
                    </span>
                    {officer.overdue > 0 && (
                      <span className="text-red-400 bg-red-950/60 px-1 py-0.2 rounded text-[10px] border border-red-800">
                        เกิน {officer.overdue}
                      </span>
                    )}
                    <span className="text-amber-400 font-bold bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/30 text-[11px]">
                      {officer.rate}%
                    </span>
                  </div>
                </div>

                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${officer.rate}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Agencies */}
        <div className="cyber-card p-4 rounded-xl">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#1E2E54]">
            <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>หน่วยงานที่รอผลตอบกลับ</span>
            </h4>
            <span className="text-[10px] text-slate-400">รอข้อมูล</span>
          </div>

          {sortedAgencies.length === 0 ? (
            <div className="text-center py-6 text-[11px] text-slate-500">
              ไม่มีข้อมูลที่ค้างรอหน่วยงานภายนอก
            </div>
          ) : (
            <div className="space-y-2">
              {sortedAgencies.map(([agency, count], idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-[#091124] border border-blue-900/40"
                >
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <span className="w-4 h-4 rounded bg-blue-950 text-amber-400 text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-slate-200 truncate font-medium">
                      {agency}
                    </span>
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/30">
                    {count} คดี
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
