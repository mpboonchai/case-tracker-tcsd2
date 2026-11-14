import React from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  LayoutGrid, 
  List, 
  X
} from 'lucide-react';
import { TASK_CATEGORIES } from '../data/initialData';

export default function CaseFilterBar({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  stepFilter,
  setStepFilter,
  officerFilter,
  setOfficerFilter,
  categoryFilter = 'all',
  setCategoryFilter = () => {},
  viewMode,
  setViewMode,
  users,
  onOpenNewCaseModal,
  totalCount,
  filteredCount
}) {
  const hasActiveFilters = searchQuery || statusFilter !== 'all' || stepFilter !== 'all' || officerFilter !== 'all' || categoryFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setStepFilter('all');
    setOfficerFilter('all');
    setCategoryFilter('all');
  };

  return (
    <div className="cyber-card p-3 sm:p-3.5 rounded-xl space-y-2.5 border border-blue-900/60 bg-[#0B142A]">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา: ชื่องาน, เลขหนังสือ ตช..., หน่วยงาน, รายละเอียด..."
            className="w-full pl-8 pr-8 py-2 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Toggle & New Case Button */}
        <div className="flex items-center gap-2 justify-end">
          
          {/* View mode toggle */}
          <div className="flex items-center bg-[#070D1E] p-0.5 rounded-lg border border-blue-900/50">
            <button
              onClick={() => setViewMode('grid')}
              title="มุมมองการ์ด (Grid View)"
              className={`p-1.5 rounded-md transition ${
                viewMode === 'grid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="มุมมองตาราง (Table View)"
              className={`p-1.5 rounded-md transition ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Case Button */}
          <button
            onClick={onOpenNewCaseModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>สร้างงานสืบสวน</span>
          </button>
        </div>

      </div>

      {/* Filter Row */}
      <div className="flex items-center gap-2 flex-wrap pt-1.5 border-t border-[#1E2E54]/60 text-xs">
        
        <span className="text-slate-400 flex items-center gap-1 font-semibold text-[11px]">
          <Filter className="w-3 h-3 text-amber-400" />
          กรอง:
        </span>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#070D1E] text-slate-200 border border-blue-900/60 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
        >
          <option value="all">สถานะ: ทั้งหมด</option>
          <option value="in_progress">⚡ กำลังสืบสวน</option>
          <option value="waiting_agency">🏛️ รอผลหน่วยงาน</option>
          <option value="overdue">⚠️ เกินกำหนด (Overdue)</option>
          <option value="completed">✅ เสร็จสิ้นครบถ้วน</option>
        </select>

        {/* 3-Step Verification Filter */}
        <select
          value={stepFilter}
          onChange={(e) => setStepFilter(e.target.value)}
          className="bg-[#070D1E] text-slate-200 border border-blue-900/60 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
        >
          <option value="all">ขั้นตอน 3 ช่อง: ทั้งหมด</option>
          <option value="not_requested">❌ ยังไม่ขอข้อมูล (ช่อง 1 ว่าง)</option>
          <option value="waiting_response">⏳ ขอแล้ว รอผล (ช่อง 1 ✓, ช่อง 2 ว่าง)</option>
          <option value="received_unverified">📥 ได้รับแล้ว รอตรวจ (ช่อง 2 ✓, ช่อง 3 ว่าง)</option>
          <option value="verified">🎯 ตรวจเรียบร้อย (ช่อง 3 ✓)</option>
        </select>

        {/* Officer Filter */}
        <select
          value={officerFilter}
          onChange={(e) => setOfficerFilter(e.target.value)}
          className="bg-[#070D1E] text-slate-200 border border-blue-900/60 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
        >
          <option value="all">ผู้รับผิดชอบ: ทุกคน</option>
          {users
            .filter(u => u.role === 'investigator' || u.role === 'leader')
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.badge})
              </option>
            ))}
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-[#070D1E] text-slate-200 border border-blue-900/60 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
        >
          <option value="all">หมวดหมู่: ทั้งหมด</option>
          {TASK_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-amber-400 hover:text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded text-[11px] border border-amber-400/30 transition"
          >
            <X className="w-3 h-3" />
            <span>ล้าง</span>
          </button>
        )}

        <span className="text-slate-400 ml-auto font-mono text-[10px]">
          แสดง <strong>{filteredCount}</strong>/{totalCount} งาน
        </span>

      </div>
    </div>
  );
}
