import React, { useState } from 'react';
import DashboardOverview from './DashboardOverview';
import CaseFilterBar from './CaseFilterBar';
import CaseCard from './CaseCard';
import TodoSheetTable from './TodoSheetTable';
import { Users, FileSpreadsheet } from 'lucide-react';
import { exportToExcel } from '../services/storage';

export default function LeaderView({
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stepFilter, setStepFilter] = useState('all');
  const [officerFilter, setOfficerFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list');

  const filteredCases = cases.filter(item => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchDoc = item.docNumber?.toLowerCase().includes(q);
      const matchAgency = item.targetAgency?.toLowerCase().includes(q);
      const matchDetails = item.details?.toLowerCase().includes(q);
      const matchNotes = item.notes?.toLowerCase().includes(q);
      const assigned = users.find(u => u.id === item.assignedTo);
      const matchOfficer = assigned?.name?.toLowerCase().includes(q);

      if (!matchTitle && !matchDoc && !matchAgency && !matchDetails && !matchNotes && !matchOfficer) {
        return false;
      }
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

    if (officerFilter !== 'all') {
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
      
      {/* Sleek Leader Command Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-blue-900/20 to-blue-950/40 border border-amber-400/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 text-base font-bold shrink-0">
            👑
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>ศูนย์บัญชาการสำนวนคดี (Leader Command Center)</span>
            </h2>
            <p className="text-[11px] text-amber-200/80">
              ติดตามภาพรวมของเจ้าหน้าที่ทุกคนในชุดสืบสวน ควบคุมกำหนดเวลา และผลการขอข้อมูลหน่วยงานภายนอก
            </p>
          </div>
        </div>

        <button
          onClick={() => exportToExcel(cases, users)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm transition cursor-pointer whitespace-nowrap"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>ออกรายงานเสนอผู้บังคับบัญชา</span>
        </button>
      </div>

      {/* Dashboard Overview Section */}
      <DashboardOverview 
        cases={cases} 
        users={users} 
        onSelectOfficerFilter={(officerId) => setOfficerFilter(officerId)} 
      />

      {/* Search & Filter Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <h3 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>รายการสำนวนคดีทั้งหมด ({filteredCases.length})</span>
          </h3>
        </div>

        <CaseFilterBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          stepFilter={stepFilter}
          setStepFilter={setStepFilter}
          officerFilter={officerFilter}
          setOfficerFilter={setOfficerFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          viewMode={viewMode}
          setViewMode={setViewMode}
          users={users}
          onOpenNewCaseModal={onOpenNewCaseModal}
          totalCount={cases.length}
          filteredCount={filteredCases.length}
        />
      </div>

      {/* Case List Display */}
      {filteredCases.length === 0 ? (
        <div className="cyber-card p-10 rounded-xl text-center border-dashed border-slate-700">
          <div className="w-10 h-10 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-slate-500 mb-2">
            🔍
          </div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-300 mb-1">ไม่พบคดีที่ตรงกับเงื่อนไขการค้นหา</h4>
          <p className="text-[11px] text-slate-500 mb-3">ลองปรับตัวกรอง หรือพิมพ์คำค้นหาใหม่อีกครั้ง</p>
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
  );
}
