import React, { useState } from 'react';
import DashboardOverview from './DashboardOverview';
import CaseFilterBar from './CaseFilterBar';
import CaseCard from './CaseCard';
import TodoSheetTable from './TodoSheetTable';
import { 
  Briefcase, 
  BarChart3, 
  Plus, 
  Layers
} from 'lucide-react';
import { getDeadlineStatus } from '../services/storage';

export default function MemberView({
  cases,
  users,
  personnel = [],
  operations = [],
  currentUser,
  onToggleCheck,
  onSaveCase,
  onEditCase,
  onDeleteCase,
  onOpenDetails,
  onOpenNewCaseModal
}) {
  const [memberTab, setMemberTab] = useState('all_tasks');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stepFilter, setStepFilter] = useState('all');
  const [officerFilter, setOfficerFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');

  const isMyTasksOnly = memberTab === 'my_tasks';

  const myCases = cases.filter(
    c => c.assignedTo === currentUser?.id || (Array.isArray(c.coAssignees) && c.coAssignees.includes(currentUser?.id))
  );
  const myCompleted = myCases.filter(
    c => c.status === 'completed' || (c.check1_requested && c.check2_received && c.check3_verified)
  ).length;
  const myOverdue = myCases.filter(c => {
    if (c.status === 'completed' || (c.check1_requested && c.check2_received && c.check3_verified)) return false;
    return getDeadlineStatus(c.deadline).type === 'overdue';
  }).length;

  const currentDisplayPool = isMyTasksOnly ? myCases : cases;

  const filteredCases = currentDisplayPool.filter(item => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchDoc = item.docNumber?.toLowerCase().includes(q);
      const matchAgency = item.targetAgency?.toLowerCase().includes(q);
      const matchDetails = item.details?.toLowerCase().includes(q);
      const matchNotes = item.notes?.toLowerCase().includes(q);
      if (!matchTitle && !matchDoc && !matchAgency && !matchDetails && !matchNotes) return false;
    }

    if (statusFilter === 'in_progress') {
      if (item.status !== 'in_progress' || (item.check1_requested && item.check2_received && item.check3_verified)) return false;
    } else if (statusFilter === 'waiting_agency') {
      if (item.status !== 'waiting_agency' && !(item.check1_requested && !item.check2_received)) return false;
    } else if (statusFilter === 'overdue') {
      if (item.status === 'completed' || (item.check1_requested && item.check2_received && item.check3_verified)) return false;
      const today = new Date().toISOString().slice(0, 10);
      if (!item.deadline || item.deadline >= today) return false;
    } else if (statusFilter === 'completed') {
      if (item.status !== 'completed' && !(item.check1_requested && item.check2_received && item.check3_verified)) return false;
    }

    if (stepFilter === 'not_requested') {
      if (item.check1_requested) return false;
    } else if (stepFilter === 'waiting_response') {
      if (!item.check1_requested || item.check2_received) return false;
    } else if (stepFilter === 'received_unverified') {
      if (!item.check2_received || item.check3_verified) return false;
    } else if (stepFilter === 'verified') {
      if (!item.check3_verified) return false;
    }

    if (!isMyTasksOnly && officerFilter !== 'all') {
      const isMain = item.assignedTo === officerFilter;
      const isCo = Array.isArray(item.coAssignees) && item.coAssignees.includes(officerFilter);
      if (!isMain && !isCo) return false;
    }

    if (categoryFilter !== 'all') {
      if (item.category !== categoryFilter) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      
      {/* Member Header & Personal Quick Stats */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-blue-900/30 via-[#0B152E] to-[#0A1224] border border-blue-800/50 shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-900 border border-amber-400/40 flex items-center justify-center text-xl shadow-md shrink-0">
              {currentUser?.avatar || '🕵️‍♂️'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs sm:text-sm font-bold text-white">
                  {currentUser?.name || 'เจ้าหน้าที่สืบสวน'}
                </h2>
                <span className="text-[9px] bg-blue-900/60 text-cyan-300 px-1.5 py-0.2 rounded border border-blue-700/50 font-mono">
                  {currentUser?.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {currentUser?.rank} • กลุ่มงานสืบสวน บก.ปอท. (CIB)
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <div className="bg-[#070D1E] px-2.5 py-1.5 rounded-lg border border-blue-900/60 text-center">
              <div className="text-[9px] text-slate-400 uppercase font-semibold">งานของฉัน</div>
              <div className="text-base font-bold text-white font-mono">{myCases.length}</div>
            </div>

            <div className="bg-[#070D1E] px-2.5 py-1.5 rounded-lg border border-emerald-900/60 text-center">
              <div className="text-[9px] text-emerald-400 uppercase font-semibold">ตรวจเสร็จแล้ว</div>
              <div className="text-base font-bold text-emerald-400 font-mono">{myCompleted}</div>
            </div>

            <div className={`bg-[#070D1E] px-2.5 py-1.5 rounded-lg border text-center ${
              myOverdue > 0 ? 'border-red-500/50 bg-red-950/20' : 'border-blue-900/60'
            }`}>
              <div className="text-[9px] text-red-400 uppercase font-semibold">เกินกำหนด</div>
              <div className="text-base font-bold text-red-400 font-mono">{myOverdue}</div>
            </div>

            <button
              onClick={onOpenNewCaseModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-sm transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span className="hidden sm:inline">สร้างงาน</span>
            </button>
          </div>

        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center justify-between border-b border-[#1E2E54] pb-1.5">
        <div className="flex items-center gap-1.5">
          
          <button
            onClick={() => setMemberTab('my_tasks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              memberTab === 'my_tasks'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>งานที่ฉันรับผิดชอบ ({myCases.length})</span>
          </button>

          <button
            onClick={() => setMemberTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              memberTab === 'dashboard'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Dashboard รวมของทีม</span>
          </button>

          <button
            onClick={() => setMemberTab('all_tasks')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              memberTab === 'all_tasks'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>งานทั้งหมดของทีม ({cases.length})</span>
          </button>

        </div>
      </div>

      {/* Tab Content */}
      {memberTab === 'dashboard' ? (
        <div className="space-y-4 animate-fadeIn">
          <div className="p-2.5 bg-blue-950/40 border border-blue-800/40 rounded-lg text-[11px] text-blue-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
            <span>หน้า Dashboard ภาพรวมทีม: ดูสถิติคดีทั้งหมด ความคืบหน้า 3 ขั้นตอน และหน่วยงานที่รอผล</span>
          </div>
          <DashboardOverview cases={cases} users={users} />
        </div>
      ) : (
        <div className="space-y-3.5 animate-fadeIn">
          
          <CaseFilterBar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            stepFilter={stepFilter}
            setStepFilter={setStepFilter}
            officerFilter={isMyTasksOnly ? currentUser?.id : officerFilter}
            setOfficerFilter={setOfficerFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            viewMode={viewMode}
            setViewMode={setViewMode}
            users={users}
            onOpenNewCaseModal={onOpenNewCaseModal}
            totalCount={currentDisplayPool.length}
            filteredCount={filteredCases.length}
          />

          {filteredCases.length === 0 ? (
            <div className="cyber-card p-10 rounded-xl text-center border-dashed border-slate-700">
              <div className="w-10 h-10 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500 mb-2">
                {isMyTasksOnly ? '🎉' : '🔍'}
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-300 mb-1">
                {isMyTasksOnly ? 'ยังไม่มีงานที่ค้างอยู่ หรือตรวจเสร็จหมดแล้ว' : 'ไม่พบคดีที่ตรงกับเงื่อนไข'}
              </h4>
              <p className="text-[11px] text-slate-500 mb-3">
                {isMyTasksOnly ? 'คุณสามารถกดสร้างงานสืบสวนใหม่เพื่อเริ่มติดตามได้ทันที' : 'ลองปรับตัวกรองการค้นหา'}
              </p>
              <button
                onClick={onOpenNewCaseModal}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition"
              >
                + สร้างงานสืบสวนใหม่
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredCases.map(caseItem => (
                <CaseCard
                  key={caseItem.id}
                  caseData={caseItem}
                  currentUser={currentUser}
                  users={users}
                  onToggleCheck={onToggleCheck}
                  onEditCase={onEditCase}
                  onDeleteCase={onDeleteCase}
                  onOpenDetails={onOpenDetails}
                />
              ))}
            </div>
          ) : (
            <TodoSheetTable
              cases={filteredCases}
              users={users}
              personnel={personnel}
              operations={operations}
              currentUser={currentUser}
              onToggleCheck={onToggleCheck}
              onSaveCase={onSaveCase}
              onEditCase={onEditCase}
              onDeleteCase={onDeleteCase}
              onOpenDetails={onOpenDetails}
            />
          )}

        </div>
      )}

    </div>
  );
}
