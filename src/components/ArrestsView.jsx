import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Plus,
  RefreshCw,
  FileText,
  Presentation,
  Copy,
  Check,
  Edit3,
  Trash2,
  Eye,
  UserCheck,
  X,
  ExternalLink,
  Calendar,
  MapPin,
  Briefcase
} from 'lucide-react';
import {
  formatThaiDate,
  formatThaiDateFull,
  generateLineReportText,
  downloadTemplateDocument
} from '../services/storage';
import WarrantModal from './WarrantModal';
import ArrestRecordModal from './ArrestRecordModal';

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export default function ArrestsView({
  warrants = [],
  cases = [],
  operations = [],
  initialCaseFilter = 'all',
  users = [],
  personnel = [],
  onSaveWarrant,
  onDeleteWarrant,
  onRefresh
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [caseFilter, setCaseFilter] = useState(initialCaseFilter || 'all');

  React.useEffect(() => {
    if (initialCaseFilter) {
      setCaseFilter(initialCaseFilter);
    }
  }, [initialCaseFilter]);
  const [isWarrantModalOpen, setIsWarrantModalOpen] = useState(false);
  const [editingWarrant, setEditingWarrant] = useState(null);
  const [arrestingWarrant, setArrestingWarrant] = useState(null);
  const [detailWarrant, setDetailWarrant] = useState(null);
  const [copiedLineId, setCopiedLineId] = useState(null);
  const [downloadingDoc, setDownloadingDoc] = useState('');
  const [docError, setDocError] = useState('');

  const availableYears = useMemo(() => {
    const years = new Set();
    warrants.forEach(w => {
      const d = w.arrestDate || w.issueDate;
      if (d && d.length >= 4) years.add(d.slice(0, 4));
    });
    if (years.size === 0) years.add(String(new Date().getFullYear()));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [warrants]);

  const getCaseDisplayName = (w) => {
    if (w.caseName && w.caseName.trim()) return w.caseName.trim();
    if (w.linkedCaseId) {
      const linked = cases.find(c => c.id === w.linkedCaseId);
      if (linked?.title) return linked.title;
    }
    return '';
  };

  const caseSummaryList = useMemo(() => {
    const map = new Map();
    operations.forEach(op => {
      const name = (op.caseName || '').trim();
      if (name && !map.has(name)) {
        map.set(name, { caseName: name, total: 0, arrested: 0, investigating: 0 });
      }
    });
    warrants.forEach(w => {
      const name = getCaseDisplayName(w) || 'ไม่ระบุชื่อเคส';
      if (!map.has(name)) {
        map.set(name, { caseName: name, total: 0, arrested: 0, investigating: 0 });
      }
      const entry = map.get(name);
      entry.total += 1;
      if (w.status === 'จับกุมแล้ว') entry.arrested += 1;
      else entry.investigating += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [warrants, cases]);

  const availableCaseNames = useMemo(
    () => caseSummaryList.map(c => c.caseName),
    [caseSummaryList]
  );

  const matchesFilters = (w) => {
    const cName = getCaseDisplayName(w) || 'ไม่ระบุชื่อเคส';
    if (caseFilter !== 'all' && cName !== caseFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const fullName = `${w.prefix || ''}${w.firstName || ''} ${w.lastName || ''}`.toLowerCase();
      const match =
        fullName.includes(q) ||
        cName.toLowerCase().includes(q) ||
        (w.nationalId || '').toLowerCase().includes(q) ||
        (w.warrantNumber || '').toLowerCase().includes(q) ||
        (w.court || '').toLowerCase().includes(q) ||
        (w.charge || '').toLowerCase().includes(q);
      if (!match) return false;
    }

    const refDate = w.status === 'จับกุมแล้ว' ? (w.arrestDate || w.issueDate) : w.issueDate;
    if (yearFilter !== 'all') {
      if (!refDate || !refDate.startsWith(yearFilter)) return false;
    }
    if (monthFilter !== 'all') {
      const m = refDate?.slice(5, 7);
      if (m !== monthFilter) return false;
    }
    return true;
  };

  const filteredWarrants = useMemo(() => warrants.filter(matchesFilters), [
    warrants,
    cases,
    searchQuery,
    monthFilter,
    yearFilter,
    caseFilter
  ]);

  const arrestedList = useMemo(
    () => filteredWarrants.filter(w => w.status === 'จับกุมแล้ว'),
    [filteredWarrants]
  );
  const activeWarrantList = useMemo(
    () => filteredWarrants.filter(w => w.status !== 'จับกุมแล้ว'),
    [filteredWarrants]
  );

  // Chart 1: Internal vs External ratio (across filtered warrants)
  const internalCount = filteredWarrants.filter(w => w.owner === 'หมายจับภายใน').length;
  const externalCount = filteredWarrants.filter(w => w.owner !== 'หมายจับภายใน').length;
  const totalChartCount = internalCount + externalCount;
  const internalPct = totalChartCount ? Math.round((internalCount / totalChartCount) * 100) : 0;

  // Chart 2: 12-month arrest trend for selected year (or latest year)
  const chartYear = yearFilter !== 'all' ? yearFilter : availableYears[0];
  const monthlyCounts = useMemo(() => {
    const counts = Array(12).fill(0);
    warrants.forEach(w => {
      if (w.status === 'จับกุมแล้ว' && w.arrestDate?.startsWith(chartYear)) {
        const mIdx = parseInt(w.arrestDate.slice(5, 7), 10) - 1;
        if (mIdx >= 0 && mIdx < 12) counts[mIdx] += 1;
      }
    });
    return counts;
  }, [warrants, chartYear]);
  const maxMonthVal = Math.max(1, ...monthlyCounts);

  const handleCopyLine = async (warrant) => {
    const text = generateLineReportText(warrant, personnel);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLineId(warrant.id);
      setTimeout(() => setCopiedLineId(null), 2500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedLineId(warrant.id);
      setTimeout(() => setCopiedLineId(null), 2500);
    }
  };

  const handleDownloadDoc = async (type, warrant) => {
    setDocError('');
    setDownloadingDoc(`${warrant.id}:${type}`);
    try {
      await downloadTemplateDocument(type, warrant);
    } catch (err) {
      setDocError(err.message || 'ไม่สามารถสร้างเอกสารได้');
    } finally {
      setDownloadingDoc('');
    }
  };

  const getLinkedCase = (linkedCaseId) => {
    if (!linkedCaseId) return null;
    return cases.find(c => c.id === linkedCaseId) || null;
  };

  const getOfficerName = (id) => {
    const u = users.find(usr => usr.id === id);
    if (u) return u.name;
    const p = personnel.find(per => per.id === id);
    if (p) return `${p.rank} ${p.firstName} ${p.lastName}`;
    return '-';
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-gradient-to-r from-red-950/30 via-[#0F1C3A] to-[#0B142A] border border-red-500/30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-red-500/15 border border-red-400/40 flex items-center justify-center text-red-400 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-white">
              ทะเบียนหมายจับ & ผลการจับกุม (Warrants & Arrests)
            </h2>
            <p className="text-[11px] text-slate-300/80">
              ติดตามหมายจับ ผลจับกุม สถิติรายเดือน พร้อมระบบสร้างเอกสารราชการ (.docx / .pptx) และรายงาน LINE อัตโนมัติ
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="รีเฟรชข้อมูล"
              className="p-2 rounded-lg bg-[#070D1E] border border-blue-900/60 text-slate-300 hover:text-amber-400 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => {
              setEditingWarrant(null);
              setIsWarrantModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>เพิ่มหมายจับ</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="cyber-card p-3 rounded-xl border border-blue-900/60 bg-[#0B142A] flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา: ชื่อผู้ต้องหา, เลขบัตร 13 หลัก, เลขหมายจับ, ศาล, ข้อหา..."
            className="w-full pl-8 pr-8 py-2 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
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

        <div className="flex items-center gap-2">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-[#070D1E] text-slate-200 border border-blue-900/60 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-amber-400"
          >
            <option value="all">ทุกเดือน</option>
            {THAI_MONTHS_SHORT.map((m, idx) => {
              const val = String(idx + 1).padStart(2, '0');
              return (
                <option key={val} value={val}>{m}</option>
              );
            })}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="bg-[#070D1E] text-slate-200 border border-blue-900/60 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-amber-400"
          >
            <option value="all">ทุกปี</option>
            {availableYears.map(y => (
              <option key={y} value={y}>พ.ศ. {Number(y) + 543}</option>
            ))}
          </select>

          <select
            value={caseFilter}
            onChange={(e) => setCaseFilter(e.target.value)}
            className="bg-[#070D1E] text-slate-200 border border-blue-900/60 rounded-lg px-2.5 py-2 text-xs max-w-[200px] focus:outline-none focus:border-amber-400"
          >
            <option value="all">ทุกเคส ({availableCaseNames.length})</option>
            {availableCaseNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0B142A] border border-emerald-500/30">
          <div className="text-[11px] text-emerald-400 font-semibold">จับกุมตัวแล้ว</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">{arrestedList.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">รายการตามตัวกรอง</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0B142A] border border-amber-500/30">
          <div className="text-[11px] text-amber-400 font-semibold">หมายจับกำลังสืบสวน</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">{activeWarrantList.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">รอติดตามจับกุม</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0B142A] border border-blue-500/30">
          <div className="text-[11px] text-cyan-400 font-semibold">หมายจับภายใน</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">{internalCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">กก.2 บก.ปอท.</div>
        </div>
        <div className="p-3.5 rounded-xl bg-[#0B142A] border border-indigo-500/30">
          <div className="text-[11px] text-indigo-300 font-semibold">หมายจับภายนอก</div>
          <div className="text-2xl font-bold text-white font-mono mt-1">{externalCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">ประสาน/ร่วมจับกุม</div>
        </div>
      </div>

      {/* 2 SVG Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
        {/* Donut Chart: Internal vs External */}
        <div className="p-4 rounded-xl bg-[#0B142A] border border-blue-900/60 flex items-center gap-4">
          <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0 -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="38"
              fill="transparent"
              stroke="#1E293B"
              strokeWidth="14"
            />
            {totalChartCount > 0 && (
              <>
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#6366F1"
                  strokeWidth="14"
                  strokeDasharray={`${2 * Math.PI * 38}`}
                  strokeDashoffset="0"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#F59E0B"
                  strokeWidth="14"
                  strokeDasharray={`${(internalPct / 100) * 2 * Math.PI * 38} ${2 * Math.PI * 38}`}
                />
              </>
            )}
          </svg>
          <div className="space-y-1.5 text-xs">
            <div className="font-bold text-white">สัดส่วนหมายจับภายใน / ภายนอก</div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              <span>ภายใน: {internalCount} ({internalPct}%)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
              <span>ภายนอก: {externalCount} ({totalChartCount ? 100 - internalPct : 0}%)</span>
            </div>
          </div>
        </div>

        {/* Bar Chart: 12-Month Arrest Trend */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-[#0B142A] border border-blue-900/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-white">
              สถิติการจับกุมรายเดือน (พ.ศ. {Number(chartYear) + 543})
            </span>
            <span className="text-[10px] text-slate-400 font-mono">หน่วย: ราย</span>
          </div>
          <svg viewBox="0 0 600 120" className="w-full h-28">
            {monthlyCounts.map((count, i) => {
              const barH = Math.round((count / maxMonthVal) * 75);
              const x = i * 48 + 16;
              const y = 90 - barH;
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width="24"
                    height={Math.max(barH, 2)}
                    rx="4"
                    fill={count > 0 ? '#10B981' : '#1E293B'}
                  />
                  {count > 0 && (
                    <text
                      x={x + 12}
                      y={y - 4}
                      textAnchor="middle"
                      fill="#FBBF24"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {count}
                    </text>
                  )}
                  <text
                    x={x + 12}
                    y="108"
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="10"
                  >
                    {THAI_MONTHS_SHORT[i]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Case-by-Case Arrest Summary */}
      {caseSummaryList.length > 0 && (
        <div className="rounded-xl bg-[#0B142A] border border-blue-900/60 overflow-hidden">
          <div className="px-4 py-2.5 bg-[#070D1E] border-b border-blue-900/50 flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-bold text-cyan-300 flex items-center gap-2">
              <Briefcase className="w-3.5 h-3.5" />
              <span>สรุปสถิติแยกตามเคส (จำนวน {caseSummaryList.length} เคส • ผู้ต้องหาทั้งหมด {warrants.length} ราย)</span>
            </div>
            {caseFilter !== 'all' && (
              <button
                onClick={() => setCaseFilter('all')}
                className="text-[11px] text-amber-400 hover:underline"
              >
                แสดงทุกเคส
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#070D1E]/60 text-slate-400 border-b border-blue-900/40">
                <tr>
                  <th className="px-3.5 py-2">ชื่อเคส</th>
                  <th className="px-3.5 py-2 text-center">ผู้ต้องหาทั้งหมด</th>
                  <th className="px-3.5 py-2 text-center">จับกุมแล้ว</th>
                  <th className="px-3.5 py-2 text-center">กำลังสืบสวน</th>
                  <th className="px-3.5 py-2 text-right">ความคืบหน้า</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-900/30">
                {caseSummaryList.map(c => {
                  const pct = c.total ? Math.round((c.arrested / c.total) * 100) : 0;
                  const active = caseFilter === c.caseName;
                  return (
                    <tr
                      key={c.caseName}
                      onClick={() => setCaseFilter(active ? 'all' : c.caseName)}
                      className={`cursor-pointer transition ${
                        active ? 'bg-blue-900/40' : 'hover:bg-blue-950/30'
                      }`}
                    >
                      <td className="px-3.5 py-2 font-semibold text-white">
                        {c.caseName}
                      </td>
                      <td className="px-3.5 py-2 text-center font-mono text-slate-200">{c.total}</td>
                      <td className="px-3.5 py-2 text-center font-mono text-emerald-400 font-bold">{c.arrested}</td>
                      <td className="px-3.5 py-2 text-center font-mono text-amber-400">{c.investigating}</td>
                      <td className="px-3.5 py-2 text-right font-mono text-cyan-300">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Table 1: Arrested */}
      <div className="rounded-xl bg-[#0B142A] border border-emerald-500/30 overflow-hidden">
        <div className="px-4 py-3 bg-emerald-950/30 border-b border-emerald-500/20 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-emerald-300 flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            <span>หมายจับที่จับกุมตัวแล้ว ({arrestedList.length})</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070D1E] text-slate-400 border-b border-blue-900/50">
              <tr>
                <th className="px-3.5 py-2.5">วันที่จับกุม</th>
                <th className="px-3.5 py-2.5">ชื่อเคส</th>
                <th className="px-3.5 py-2.5">ผู้ต้องหา / เลขบัตร</th>
                <th className="px-3.5 py-2.5">หมายจับ / ศาล</th>
                <th className="px-3.5 py-2.5">ข้อหา</th>
                <th className="px-3.5 py-2.5">ประเภท</th>
                <th className="px-3.5 py-2.5 text-right">จัดการ & เอกสาร</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/40">
              {arrestedList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    ยังไม่มีรายการจับกุมในช่วงที่เลือก
                  </td>
                </tr>
              ) : (
                arrestedList.map(w => (
                  <tr key={w.id} className="hover:bg-blue-950/30 transition">
                    <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-emerald-300">
                      {formatThaiDate(w.arrestDate) || '-'}
                    </td>
                    <td className="px-3.5 py-2.5 max-w-[180px]">
                      <span className="inline-block px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-200 text-[11px] line-clamp-2">
                        {getCaseDisplayName(w) || 'ไม่ระบุชื่อเคส'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-white">
                        {w.prefix}{w.firstName} {w.lastName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {w.nationalId || '-'}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="font-semibold text-amber-300">{w.warrantNumber}</div>
                      <div className="text-[10px] text-slate-400">{w.court}</div>
                    </td>
                    <td className="px-3.5 py-2.5 max-w-xs">
                      <p className="line-clamp-2 text-slate-300">{w.charge}</p>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          w.owner === 'หมายจับภายใน'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                        }`}
                      >
                        {w.owner}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setDetailWarrant(w)}
                          title="ดูรายละเอียด & สร้างเอกสาร"
                          className="p-1.5 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleCopyLine(w)}
                          title="คัดลอกรายงาน LINE"
                          className="p-1.5 rounded bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/40 transition"
                        >
                          {copiedLineId === w.id ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => setArrestingWarrant(w)}
                          title="แก้ไขบันทึกการจับกุม"
                          className="p-1.5 rounded bg-amber-600/20 text-amber-300 hover:bg-amber-600/40 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Table 2: Active Warrants (Investigating) */}
      <div className="rounded-xl bg-[#0B142A] border border-amber-500/30 overflow-hidden">
        <div className="px-4 py-3 bg-amber-950/20 border-b border-amber-500/20 flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>หมายจับที่กำลังสืบสวน ({activeWarrantList.length})</span>
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#070D1E] text-slate-400 border-b border-blue-900/50">
              <tr>
                <th className="px-3.5 py-2.5">วันที่ออกหมาย</th>
                <th className="px-3.5 py-2.5">ชื่อเคส</th>
                <th className="px-3.5 py-2.5">ผู้ต้องหา / เลขบัตร</th>
                <th className="px-3.5 py-2.5">หมายจับ / ศาล</th>
                <th className="px-3.5 py-2.5">ข้อหา</th>
                <th className="px-3.5 py-2.5">ผู้รับผิดชอบ</th>
                <th className="px-3.5 py-2.5 text-right">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-900/40">
              {activeWarrantList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    ไม่มีหมายจับที่อยู่ระหว่างสืบสวน
                  </td>
                </tr>
              ) : (
                activeWarrantList.map(w => (
                  <tr key={w.id} className="hover:bg-blue-950/30 transition">
                    <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-slate-300">
                      {formatThaiDate(w.issueDate) || '-'}
                    </td>
                    <td className="px-3.5 py-2.5 max-w-[180px]">
                      <span className="inline-block px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/25 text-cyan-200 text-[11px] line-clamp-2">
                        {getCaseDisplayName(w) || 'ไม่ระบุชื่อเคส'}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-white">
                        {w.prefix}{w.firstName} {w.lastName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {w.nationalId || '-'}
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <div className="font-semibold text-amber-300">{w.warrantNumber}</div>
                      <div className="text-[10px] text-slate-400">{w.court}</div>
                    </td>
                    <td className="px-3.5 py-2.5 max-w-xs">
                      <p className="line-clamp-2 text-slate-300">{w.charge}</p>
                    </td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap text-slate-300">
                      {getOfficerName(w.assignedTo)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => setArrestingWarrant(w)}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition"
                        >
                          จับกุมตัว
                        </button>
                        <button
                          onClick={() => setDetailWarrant(w)}
                          title="ดูรายละเอียด"
                          className="p-1.5 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/40 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingWarrant(w);
                            setIsWarrantModalOpen(true);
                          }}
                          title="แก้ไขหมายจับ"
                          className="p-1.5 rounded bg-slate-700/60 text-slate-300 hover:bg-slate-700 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warrant & Arrest Detail Modal */}
      {detailWarrant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-3xl bg-[#0B142A] border border-blue-800/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#0F1C3A] to-[#0B142A] border-b border-blue-900/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{detailWarrant.prefix}{detailWarrant.firstName} {detailWarrant.lastName}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      detailWarrant.status === 'จับกุมแล้ว'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {detailWarrant.status}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  หมายจับ {detailWarrant.court} ที่ {detailWarrant.warrantNumber} • ออกหมาย {formatThaiDate(detailWarrant.issueDate) || '-'}
                </p>
              </div>
              <button
                onClick={() => {
                  setDetailWarrant(null);
                  setDocError('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Suspect & Address Info (Unmasked per user requirement) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-blue-900/50 space-y-1.5">
                  <div className="text-[11px] font-bold text-amber-400">ข้อมูลผู้ต้องหา</div>
                  <div><span className="text-slate-400">เลขบัตรประชาชน:</span> <span className="font-mono text-white">{detailWarrant.nationalId || '-'}</span></div>
                  <div><span className="text-slate-400">วันเกิด:</span> {formatThaiDate(detailWarrant.dob) || '-'} ({detailWarrant.age || '-'} ปี)</div>
                  <div>
                    <span className="text-slate-400">ที่อยู่:</span>{' '}
                    {[
                      detailWarrant.houseNo && `เลขที่ ${detailWarrant.houseNo}`,
                      detailWarrant.moo && `หมู่ ${detailWarrant.moo}`,
                      detailWarrant.road && `ถ.${detailWarrant.road}`,
                      detailWarrant.subdistrict && `ต.${detailWarrant.subdistrict}`,
                      detailWarrant.district && `อ.${detailWarrant.district}`,
                      detailWarrant.province && `จ.${detailWarrant.province}`
                    ]
                      .filter(Boolean)
                      .join(' ') || '-'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-blue-900/50 space-y-1.5">
                  <div className="text-[11px] font-bold text-cyan-400">ข้อมูลหมายจับ & คดี</div>
                  <div><span className="text-slate-400">เจ้าของหมาย:</span> {detailWarrant.owner}</div>
                  <div><span className="text-slate-400">ผู้รับผิดชอบ:</span> {getOfficerName(detailWarrant.assignedTo)}</div>
                  {getLinkedCase(detailWarrant.linkedCaseId) && (
                    <div className="flex items-center gap-1 text-emerald-300">
                      <Briefcase className="w-3.5 h-3.5 shrink-0" />
                      <span>เชื่อมคดี: {getLinkedCase(detailWarrant.linkedCaseId).title}</span>
                    </div>
                  )}
                  <div className="pt-1 text-slate-200 leading-relaxed">
                    <span className="text-slate-400">ข้อหา:</span> {detailWarrant.charge}
                  </div>
                </div>
              </div>

              {/* Arrest Result Info if arrested */}
              {detailWarrant.status === 'จับกุมแล้ว' && (
                <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1.5">
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>รายละเอียดการจับกุม</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400">วัน/เวลาจับกุม:</span>{' '}
                      {formatThaiDate(detailWarrant.arrestDate)} {detailWarrant.arrestTime ? `เวลา ${detailWarrant.arrestTime} น.` : ''}
                    </div>
                    <div>
                      <span className="text-slate-400">สถานที่จับกุม:</span>{' '}
                      {detailWarrant.arrestLocation} {detailWarrant.arrestSubdistrict} {detailWarrant.arrestDistrict} {detailWarrant.arrestProvince}
                    </div>
                    <div>
                      <span className="text-slate-400">ส่งมอบตัว:</span>{' '}
                      {detailWarrant.handoverOfficer || '-'} ({detailWarrant.handoverLocation || '-'})
                    </div>
                    <div>
                      <span className="text-slate-400">ชุดจับกุม:</span>{' '}
                      {(detailWarrant.arrestingOfficers || []).length} นาย
                    </div>
                  </div>
                </div>
              )}

              {/* Uploaded Photos Preview (if any) */}
              {(detailWarrant.personPhotoUrl ||
                detailWarrant.houseRegUrl ||
                detailWarrant.naraiRegUrl ||
                detailWarrant.photoArrest ||
                detailWarrant.photoFront ||
                detailWarrant.photoLeft ||
                detailWarrant.photoRight ||
                detailWarrant.photoBack ||
                detailWarrant.photoReport1 ||
                detailWarrant.photoReport2 ||
                detailWarrant.photoReport3) && (
                <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-blue-900/50 space-y-2">
                  <div className="text-[11px] font-bold text-amber-400">
                    ภาพข้อมูลผู้ต้องหา (ทร.14 / Narai) & ภาพถ่ายประกอบบันทึกจับกุม
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      ['personPhotoUrl', 'รูปภาพผู้ต้องหา'],
                      ['houseRegUrl', 'ทะเบียนราษฎร์ (ทร.14)'],
                      ['naraiRegUrl', 'ฐานข้อมูล Narai'],
                      ['photoArrest', 'ขณะจับกุม'],
                      ['photoFront', 'ด้านหน้า'],
                      ['photoLeft', 'ด้านซ้าย'],
                      ['photoRight', 'ด้านขวา'],
                      ['photoBack', 'ด้านหลัง'],
                      ['photoReport1', 'รายงาน 1 (PPT)'],
                      ['photoReport2', 'รายงาน 2 (PPT)'],
                      ['photoReport3', 'รายงาน 3 (PPT)']
                    ].map(([k, lbl]) =>
                      detailWarrant[k] ? (
                        <div key={k} className="space-y-1 text-center">
                          <a
                            href={detailWarrant[k]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                          >
                            <img
                              src={detailWarrant[k]}
                              alt={lbl}
                              className="w-full aspect-[4/3] object-cover rounded-lg border border-blue-800/60 hover:border-amber-400 transition"
                            />
                          </a>
                          <div className="text-[10px] text-slate-400">{lbl}</div>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {/* Document Generation Section */}
              <div className="p-3.5 rounded-xl bg-[#070D1E] border border-amber-500/30 space-y-2.5">
                <div className="text-[11px] font-bold text-amber-400">
                  สร้างเอกสารราชการอัตโนมัติ (จาก Template มาตรฐาน กก.2 บก.ปอท.)
                </div>
                {docError && (
                  <div className="p-2 rounded bg-red-950/60 border border-red-500/40 text-red-300 text-[11px]">
                    {docError}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!!downloadingDoc}
                    onClick={() => handleDownloadDoc('arrest_record', detailWarrant)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-200 font-semibold transition disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>
                      {downloadingDoc === `${detailWarrant.id}:arrest_record`
                        ? 'กำลังสร้าง...'
                        : 'บันทึกการจับกุม (.docx)'}
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={!!downloadingDoc}
                    onClick={() => handleDownloadDoc('sec22', detailWarrant)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-200 font-semibold transition disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>ม.22 วรรคสอง (.docx)</span>
                  </button>
                  <button
                    type="button"
                    disabled={!!downloadingDoc}
                    onClick={() => handleDownloadDoc('sec23', detailWarrant)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/40 text-blue-200 font-semibold transition disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>ม.23 (.docx)</span>
                  </button>
                  <button
                    type="button"
                    disabled={!!downloadingDoc}
                    onClick={() => handleDownloadDoc('ppt', detailWarrant)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/40 text-amber-200 font-semibold transition disabled:opacity-50"
                  >
                    <Presentation className="w-3.5 h-3.5" />
                    <span>รายงานการจับกุม (.pptx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyLine(detailWarrant)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-200 font-semibold transition"
                  >
                    {copiedLineId === detailWarrant.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>คัดลอกข้อความ LINE แล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกรายงาน LINE</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-5 py-3 bg-[#070D1E] border-t border-blue-900/50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`ยืนยันลบหมายจับเลขที่ ${detailWarrant.warrantNumber}?`)) {
                    onDeleteWarrant(detailWarrant.id);
                    setDetailWarrant(null);
                  }
                }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-semibold transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ลบหมายจับ</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = detailWarrant;
                    setDetailWarrant(null);
                    setEditingWarrant(target);
                    setIsWarrantModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>แก้ไขข้อมูลหมาย</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = detailWarrant;
                    setDetailWarrant(null);
                    setArrestingWarrant(target);
                  }}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{detailWarrant.status === 'จับกุมแล้ว' ? 'แก้ไขผลจับกุม' : 'จับกุมตัว'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <WarrantModal
        isOpen={isWarrantModalOpen}
        onClose={() => {
          setIsWarrantModalOpen(false);
          setEditingWarrant(null);
        }}
        onSave={(data) => {
          onSaveWarrant(data);
        }}
        editingWarrant={editingWarrant}
        cases={cases}
        operations={operations}
        warrants={warrants}
        users={users}
      />

      <ArrestRecordModal
        isOpen={!!arrestingWarrant}
        onClose={() => setArrestingWarrant(null)}
        onSave={(updated) => {
          onSaveWarrant(updated);
          setArrestingWarrant(null);
        }}
        warrant={arrestingWarrant}
        personnel={personnel}
      />
    </div>
  );
}
