import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  BarChart3,
  PieChart,
  Users,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit3,
  Trash2,
  Eye,
  X,
  Calendar,
  UserCheck,
  FileText,
  Sparkles,
  ArrowRight,
  FolderOpen,
  Link as LinkIcon,
  LayoutGrid,
  List
} from 'lucide-react';
import { CASE_OPERATION_STATUSES } from '../data/initialData';
import { formatThaiDate } from '../services/storage';
import DateInput, { getTodayDMY, toDMY } from './DateInput';

const STATUS_CONFIG = {
  'กำลังสืบสวน': {
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    dot: 'bg-amber-400',
    bar: 'bg-amber-500',
    stroke: '#f59e0b',
    label: 'กำลังสืบสวน'
  },
  'จับกุมแล้ว': {
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    dot: 'bg-emerald-400',
    bar: 'bg-emerald-500',
    stroke: '#10b981',
    label: 'จับกุมแล้ว'
  },
  'ขยายผลเพิ่ม': {
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    dot: 'bg-purple-400',
    bar: 'bg-purple-500',
    stroke: '#a855f7',
    label: 'ขยายผลเพิ่ม'
  },
  'เสร็จสิ้น': {
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    dot: 'bg-cyan-400',
    bar: 'bg-cyan-500',
    stroke: '#06b6d4',
    label: 'เสร็จสิ้น'
  }
};

export default function CaseOperationsView({
  operations = [],
  warrants = [],
  personnel = [],
  onSaveOperation,
  onDeleteOperation,
  onJumpToArrestsCase
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ทั้งหมด');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [showDashboard, setShowDashboard] = useState(true);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingOp, setEditingOp] = useState(null);
  const [selectedDetailOp, setSelectedDetailOp] = useState(null);

  // Form fields
  const [formData, setFormData] = useState({
    caseName: '',
    caseCode: '',
    status: 'กำลังสืบสวน',
    details: '',
    additionalNotes: '',
    leadOfficerId: '',
    startDate: getTodayDMY(),
    driveFolderUrl: '',
    relatedLinks: ''
  });

  // Merge stored operations with any caseName found in warrants so no case is missed
  const enrichedOperations = useMemo(() => {
    const mapByName = new Map();

    operations.forEach((op) => {
      const key = (op.caseName || '').trim().toLowerCase();
      if (key) {
        mapByName.set(key, { ...op, isVirtual: false });
      }
    });

    // Discover any warrant caseName that doesn't have an explicit operation entry yet
    warrants.forEach((w) => {
      const rawName = (w.caseName || '').trim();
      if (!rawName) return;
      const key = rawName.toLowerCase();
      if (!mapByName.has(key)) {
        mapByName.set(key, {
          id: `virtual-${key}`,
          caseName: rawName,
          caseCode: 'AUTO-LINK',
          status: 'กำลังสืบสวน',
          details: `เคสที่ตรวจพบอัตโนมัติจากฐานข้อมูลหมายจับ (${rawName})`,
          additionalNotes: '',
          leadOfficerId: '',
          startDate: w.issueDate || '',
          driveFolderUrl: '',
          relatedLinks: '',
          isVirtual: true
        });
      }
    });

    // Attach suspect/warrant statistics to each case
    const result = Array.from(mapByName.values()).map((op) => {
      const key = (op.caseName || '').trim().toLowerCase();
      const caseWarrants = warrants.filter(
        (w) => (w.caseName || '').trim().toLowerCase() === key
      );
      const totalSuspects = caseWarrants.length;
      const arrestedCount = caseWarrants.filter(
        (w) => w.status === 'จับกุมแล้ว'
      ).length;
      const wantedCount = totalSuspects - arrestedCount;
      const progressPct =
        totalSuspects > 0 ? Math.round((arrestedCount / totalSuspects) * 100) : 0;

      const leadOfficer = personnel.find((p) => p.id === op.leadOfficerId);
      const leadOfficerName = leadOfficer
        ? `${leadOfficer.rank || ''}${leadOfficer.firstName || ''} ${leadOfficer.lastName || ''}`.trim()
        : op.leadOfficerName || 'ยังไม่ระบุหัวหน้าชุด';

      return {
        ...op,
        warrants: caseWarrants,
        totalSuspects,
        arrestedCount,
        wantedCount,
        progressPct,
        leadOfficerName
      };
    });

    // Sort: cases with suspects first, then by updatedAt/createdAt
    return result.sort((a, b) => {
      if (b.totalSuspects !== a.totalSuspects) {
        return b.totalSuspects - a.totalSuspects;
      }
      return (a.caseName || '').localeCompare(b.caseName || '', 'th');
    });
  }, [operations, warrants, personnel]);

  // Overall Dashboard KPIs
  const dashboardStats = useMemo(() => {
    const totalCases = enrichedOperations.length;
    const statusCounts = {
      'กำลังสืบสวน': 0,
      'จับกุมแล้ว': 0,
      'ขยายผลเพิ่ม': 0,
      'เสร็จสิ้น': 0
    };
    enrichedOperations.forEach((op) => {
      const st = STATUS_CONFIG[op.status] ? op.status : 'กำลังสืบสวน';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    const totalSuspects = warrants.length;
    const totalArrested = warrants.filter((w) => w.status === 'จับกุมแล้ว').length;
    const totalWanted = totalSuspects - totalArrested;
    const unassignedWarrants = warrants.filter(
      (w) => !(w.caseName || '').trim()
    ).length;
    const arrestRate =
      totalSuspects > 0 ? Math.round((totalArrested / totalSuspects) * 100) : 0;

    return {
      totalCases,
      statusCounts,
      totalSuspects,
      totalArrested,
      totalWanted,
      unassignedWarrants,
      arrestRate
    };
  }, [enrichedOperations, warrants]);

  // Filtered operations
  const filteredOperations = useMemo(() => {
    return enrichedOperations.filter((op) => {
      const matchesStatus =
        statusFilter === 'ทั้งหมด' || op.status === statusFilter;
      const q = searchTerm.trim().toLowerCase();
      if (!q) return matchesStatus;
      const matchesSearch =
        (op.caseName || '').toLowerCase().includes(q) ||
        (op.caseCode || '').toLowerCase().includes(q) ||
        (op.details || '').toLowerCase().includes(q) ||
        (op.additionalNotes || '').toLowerCase().includes(q) ||
        (op.leadOfficerName || '').toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [enrichedOperations, statusFilter, searchTerm]);

  const handleOpenCreate = () => {
    setEditingOp(null);
    setFormData({
      caseName: '',
      caseCode: `TCSD2-${new Date().getFullYear() + 543}-${String(operations.length + 1).padStart(2, '0')}`,
      status: 'กำลังสืบสวน',
      details: '',
      additionalNotes: '',
      leadOfficerId: personnel[0]?.id || '',
      startDate: getTodayDMY(),
      driveFolderUrl: '',
      relatedLinks: ''
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (op) => {
    setEditingOp(op.isVirtual ? null : op);
    setFormData({
      caseName: op.caseName || '',
      caseCode:
        op.caseCode === 'AUTO-LINK'
          ? `TCSD2-${new Date().getFullYear() + 543}-${String(operations.length + 1).padStart(2, '0')}`
          : op.caseCode || '',
      status: op.status || 'กำลังสืบสวน',
      details: op.details || '',
      additionalNotes: op.additionalNotes || '',
      leadOfficerId: op.leadOfficerId || '',
      startDate: toDMY(op.startDate) || getTodayDMY(),
      driveFolderUrl: op.driveFolderUrl || '',
      relatedLinks: op.relatedLinks || ''
    });
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.caseName.trim()) return;

    const payload = {
      ...(editingOp ? { id: editingOp.id } : {}),
      caseName: formData.caseName.trim(),
      caseCode: formData.caseCode.trim(),
      status: formData.status,
      details: formData.details.trim(),
      additionalNotes: formData.additionalNotes.trim(),
      leadOfficerId: formData.leadOfficerId,
      startDate: formData.startDate,
      driveFolderUrl: formData.driveFolderUrl.trim(),
      relatedLinks: formData.relatedLinks.trim(),
      updatedAt: new Date().toISOString()
    };

    onSaveOperation(payload);
    setIsFormModalOpen(false);
    if (selectedDetailOp && selectedDetailOp.caseName === payload.caseName) {
      setSelectedDetailOp((prev) => ({ ...prev, ...payload }));
    }
  };

  const handleQuickStatusChange = (op, newStatus) => {
    const payload = {
      ...(op.isVirtual ? {} : { id: op.id }),
      caseName: op.caseName,
      caseCode: op.caseCode === 'AUTO-LINK' ? `TCSD2-CASE` : op.caseCode,
      status: newStatus,
      details: op.details || '',
      additionalNotes: op.additionalNotes || '',
      leadOfficerId: op.leadOfficerId || '',
      startDate: toDMY(op.startDate) || getTodayDMY(),
      driveFolderUrl: op.driveFolderUrl || '',
      relatedLinks: op.relatedLinks || '',
      updatedAt: new Date().toISOString()
    };
    onSaveOperation(payload);
    if (selectedDetailOp && selectedDetailOp.caseName === op.caseName) {
      setSelectedDetailOp((prev) => ({ ...prev, status: newStatus }));
    }
  };

  // Refresh selectedDetailOp from enrichedOperations when warrants or operations update
  const activeDetailOp = useMemo(() => {
    if (!selectedDetailOp) return null;
    return (
      enrichedOperations.find(
        (o) =>
          o.id === selectedDetailOp.id ||
          o.caseName.toLowerCase() === selectedDetailOp.caseName.toLowerCase()
      ) || selectedDetailOp
    );
  }, [selectedDetailOp, enrichedOperations]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0F1B38] via-[#132347] to-[#0D162E] border border-[#243B6B] rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-400/40 flex items-center justify-center shrink-0 shadow-inner">
              <FolderKanban className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  ศูนย์บริหารเคสคดี & แดชบอร์ดสถิติแยกเคส
                </h2>
                <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                  Case Operations Center
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                แยกภาพรวมระดับ <span className="text-amber-300 font-semibold">"เคสปฏิบัติการ/คดีสำคัญ"</span> ออกจากงานประจำวัน พร้อมเชื่อมโยงข้อมูลผู้ต้องหาและหมายจับแบบอัตโนมัติ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center">
            <button
              onClick={() => setShowDashboard((v) => !v)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600/60 transition"
            >
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              <span>{showDashboard ? 'ซ่อนแดชบอร์ดสถิติ' : 'แสดงแดชบอร์ดสถิติ'}</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-900/40 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างเคสใหม่</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: CASE ANALYTICS DASHBOARD */}
      {showDashboard && (
        <div className="space-y-5">
          {/* Top KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: จำนวนเคสทั้งหมด */}
            <div className="bg-[#0E172E] border border-[#1E2E54] rounded-2xl p-4 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  จำนวนเคสคดีทั้งหมด
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center">
                  <FolderKanban className="w-4 h-4 text-indigo-400" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {dashboardStats.totalCases}
                </span>
                <span className="text-xs text-slate-400">เคสปฏิบัติการ</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800 grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="flex items-center gap-1.5 text-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>กำลังสืบสวน: {dashboardStats.statusCounts['กำลังสืบสวน']}</span>
                </div>
                <div className="flex items-center gap-1.5 text-purple-300">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span>ขยายผลเพิ่ม: {dashboardStats.statusCounts['ขยายผลเพิ่ม']}</span>
                </div>
                <div className="flex items-center gap-1.5 text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>จับกุมแล้ว: {dashboardStats.statusCounts['จับกุมแล้ว']}</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>เสร็จสิ้น: {dashboardStats.statusCounts['เสร็จสิ้น']}</span>
                </div>
              </div>
            </div>

            {/* Card 2: ผู้ต้องหาทั้งหมด */}
            <div className="bg-[#0E172E] border border-[#1E2E54] rounded-2xl p-4 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">
                  ผู้ต้องหาตามหมายจับทั้งหมด
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  {dashboardStats.totalSuspects}
                </span>
                <span className="text-xs text-slate-400">ราย (ทุกเคสรวมกัน)</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
                <span>เชื่อมโยงเข้ากับเคสแล้ว</span>
                <span className="font-bold text-blue-300">
                  {dashboardStats.totalSuspects - dashboardStats.unassignedWarrants} / {dashboardStats.totalSuspects} ราย
                </span>
              </div>
            </div>

            {/* Card 3: จับกุมแล้ว */}
            <div className="bg-[#0E172E] border border-emerald-500/30 rounded-2xl p-4 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300/90">
                  ผู้ต้องหาที่จับกุมแล้ว
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-emerald-400">
                  {dashboardStats.totalArrested}
                </span>
                <span className="text-xs text-slate-300">
                  ราย ({dashboardStats.arrestRate}% ของทั้งหมด)
                </span>
              </div>
              <div className="mt-3">
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                    style={{ width: `${dashboardStats.arrestRate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Card 4: ยังหลบหนี / ติดตามจับกุม */}
            <div className="bg-[#0E172E] border border-amber-500/30 rounded-2xl p-4 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-300/90">
                  อยู่ระหว่างสืบสวนติดตามจับกุม
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-amber-400">
                  {dashboardStats.totalWanted}
                </span>
                <span className="text-xs text-slate-300">
                  ราย (เป้าหมายคงเหลือ)
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-300">
                <span>เคสที่กำลังขยายผลเพิ่ม</span>
                <span className="font-bold text-purple-300">
                  {dashboardStats.statusCounts['ขยายผลเพิ่ม']} เคส
                </span>
              </div>
            </div>
          </div>

          {/* Per-Case Analytics Chart + Breakdown Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left 2 Cols: Horizontal Bar Comparison Per Case */}
            <div className="lg:col-span-2 bg-[#0E172E] border border-[#1E2E54] rounded-2xl p-5 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-indigo-400" />
                    <span>กราฟเปรียบเทียบสถิติผู้ต้องหา & ผลการจับกุมแยกตามเคส</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    คลิกที่แถบเคสเพื่อเปิดดูรายชื่อผู้ต้องหาและรายละเอียดของเคสนั้นทันที
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-emerald-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                    จับกุมแล้ว
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/70" />
                    หลบหนี/กำลังติดตาม
                  </span>
                </div>
              </div>

              <div className="space-y-3.5 max-h-[340px] overflow-y-auto pr-1">
                {enrichedOperations.map((op) => {
                  const stConfig =
                    STATUS_CONFIG[op.status] || STATUS_CONFIG['กำลังสืบสวน'];
                  const maxSuspects = Math.max(
                    ...enrichedOperations.map((o) => o.totalSuspects),
                    1
                  );
                  const barScalePct =
                    op.totalSuspects > 0
                      ? Math.max(12, Math.round((op.totalSuspects / maxSuspects) * 100))
                      : 0;

                  return (
                    <div
                      key={op.id}
                      onClick={() => setSelectedDetailOp(op)}
                      className="group p-3 rounded-xl bg-[#091022] hover:bg-[#121E3D] border border-slate-800 hover:border-indigo-500/40 transition cursor-pointer"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                            {op.caseCode || 'CASE'}
                          </span>
                          <span className="text-sm font-bold text-white group-hover:text-indigo-300 transition truncate">
                            เคส {op.caseName}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${stConfig.badge}`}
                          >
                            {op.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-slate-300">
                            ผู้ต้องหาทั้งหมด{' '}
                            <strong className="text-white">{op.totalSuspects}</strong> ราย
                          </span>
                          <span className="text-emerald-400 font-semibold">
                            จับกุมแล้ว {op.arrestedCount}
                          </span>
                          <span className="text-amber-400 font-semibold">
                            คงเหลือ {op.wantedCount}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold text-[11px]">
                            {op.progressPct}%
                          </span>
                        </div>
                      </div>

                      {/* Stacked Progress Bar */}
                      {op.totalSuspects > 0 ? (
                        <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden p-0.5 border border-slate-800">
                          <div
                            className="h-full rounded-full overflow-hidden flex transition-all duration-500"
                            style={{ width: `${barScalePct}%` }}
                          >
                            {op.arrestedCount > 0 && (
                              <div
                                className="bg-emerald-500 h-full transition-all duration-500"
                                style={{
                                  width: `${(op.arrestedCount / op.totalSuspects) * 100}%`
                                }}
                                title={`จับกุมแล้ว ${op.arrestedCount} ราย`}
                              />
                            )}
                            {op.wantedCount > 0 && (
                              <div
                                className="bg-amber-500/75 h-full transition-all duration-500"
                                style={{
                                  width: `${(op.wantedCount / op.totalSuspects) * 100}%`
                                }}
                                title={`หลบหนี/กำลังสืบสวน ${op.wantedCount} ราย`}
                              />
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500 italic">
                          ยังไม่มีรายชื่อหมายจับที่ผูกชื่อเคส "{op.caseName}" (สามารถเลือกชื่อเคสนี้ในหน้าการจับกุมได้ทันที)
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col: Summary Table by Case Status & Quick Insights */}
            <div className="bg-[#0E172E] border border-[#1E2E54] rounded-2xl p-5 shadow-md flex flex-col justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 mb-1">
                  <PieChart className="w-4 h-4 text-cyan-400" />
                  <span>ตารางสรุปสถิติแยกตามเคส</span>
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  สรุปจำนวนผู้ต้องหาทั้งหมด vs จับกุมแล้วในแต่ละเคส
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="py-2 font-semibold">ชื่อเคส</th>
                        <th className="py-2 font-semibold text-center">ทั้งหมด</th>
                        <th className="py-2 font-semibold text-center text-emerald-400">
                          จับแล้ว
                        </th>
                        <th className="py-2 font-semibold text-center text-amber-400">
                          หลบหนี
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {enrichedOperations.map((op) => (
                        <tr
                          key={op.id}
                          onClick={() => setSelectedDetailOp(op)}
                          className="hover:bg-slate-800/40 cursor-pointer transition"
                        >
                          <td className="py-2 pr-2 font-medium text-white">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  (STATUS_CONFIG[op.status] || STATUS_CONFIG['กำลังสืบสวน'])
                                    .dot
                                }`}
                              />
                              <span className="truncate max-w-[130px]">
                                {op.caseName}
                              </span>
                            </div>
                          </td>
                          <td className="py-2 text-center font-bold text-slate-200">
                            {op.totalSuspects}
                          </td>
                          <td className="py-2 text-center font-bold text-emerald-400">
                            {op.arrestedCount}
                          </td>
                          <td className="py-2 text-center font-bold text-amber-400">
                            {op.wantedCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-700 font-bold text-white bg-slate-900/60">
                        <td className="py-2 pl-1">รวมทุกเคส ({enrichedOperations.length})</td>
                        <td className="py-2 text-center">{dashboardStats.totalSuspects}</td>
                        <td className="py-2 text-center text-emerald-400">
                          {dashboardStats.totalArrested}
                        </td>
                        <td className="py-2 text-center text-amber-400">
                          {dashboardStats.totalWanted}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>เชื่อมโยงข้อมูลอัตโนมัติกับหน้าการจับกุม</span>
                <span className="text-indigo-400 font-semibold">Real-time Sync</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: FILTER BAR & CASE LIST */}
      <div className="bg-[#0E172E] border border-[#1E2E54] rounded-2xl p-4 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {['ทั้งหมด', ...CASE_OPERATION_STATUSES].map((st) => {
              const active = statusFilter === st;
              const count =
                st === 'ทั้งหมด'
                  ? enrichedOperations.length
                  : dashboardStats.statusCounts[st] || 0;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-[#091022] text-slate-300 hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  <span>{st}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      active ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & View Switcher */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหาชื่อเคส, รหัสเคส, รายละเอียด..."
                className="w-full pl-9 pr-3 py-1.5 bg-[#091022] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center bg-[#091022] p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'grid'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="มุมมองการ์ด"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition ${
                  viewMode === 'table'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="มุมมองตาราง"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CASE CARDS GRID VIEW */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredOperations.map((op) => {
              const stConfig =
                STATUS_CONFIG[op.status] || STATUS_CONFIG['กำลังสืบสวน'];

              return (
                <div
                  key={op.id}
                  className="bg-[#091022] border border-[#1E2E54] hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col justify-between transition shadow-lg group"
                >
                  <div>
                    {/* Top Row: Code + Status Dropdown */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
                        {op.caseCode || 'CASE'}
                      </span>

                      <select
                        value={op.status}
                        onChange={(e) => handleQuickStatusChange(op, e.target.value)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border cursor-pointer focus:outline-none ${stConfig.badge} bg-[#091022]`}
                      >
                        {CASE_OPERATION_STATUSES.map((st) => (
                          <option
                            key={st}
                            value={st}
                            className="bg-slate-900 text-white"
                          >
                            สถานะ: {st}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Case Name & Details */}
                    <h3
                      onClick={() => setSelectedDetailOp(op)}
                      className="text-lg font-extrabold text-white group-hover:text-indigo-300 transition cursor-pointer flex items-center gap-2"
                    >
                      <span>เคส {op.caseName}</span>
                    </h3>

                    <p className="text-xs text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                      {op.details || 'ยังไม่มีรายละเอียดสังเขปสำหรับเคสนี้'}
                    </p>

                    {/* Additional Notes / ขยายผล highlight */}
                    {op.additionalNotes && (
                      <div className="mt-3 p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-[11px] text-purple-200">
                        <div className="font-bold text-purple-300 flex items-center gap-1 mb-0.5">
                          <Sparkles className="w-3 h-3" />
                          <span>รายละเอียดเพิ่มเติม / การขยายผล:</span>
                        </div>
                        <p className="line-clamp-2 text-slate-300">
                          {op.additionalNotes}
                        </p>
                      </div>
                    )}

                    {/* Suspect Counter Box */}
                    <div className="mt-4 p-3 rounded-xl bg-[#0E172E] border border-slate-800/90">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-400 font-medium">
                          ความคืบหน้าการจับกุมในเคส
                        </span>
                        <span className="font-bold text-cyan-300">
                          {op.arrestedCount}/{op.totalSuspects} ราย ({op.progressPct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-2.5">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full transition-all duration-500"
                          style={{ width: `${op.progressPct}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                        <div className="bg-slate-900/90 py-1.5 rounded-lg border border-slate-800">
                          <div className="text-slate-400">ผู้ต้องหา</div>
                          <div className="text-sm font-extrabold text-white">
                            {op.totalSuspects}
                          </div>
                        </div>
                        <div className="bg-emerald-950/30 py-1.5 rounded-lg border border-emerald-500/20">
                          <div className="text-emerald-300">จับกุมแล้ว</div>
                          <div className="text-sm font-extrabold text-emerald-400">
                            {op.arrestedCount}
                          </div>
                        </div>
                        <div className="bg-amber-950/30 py-1.5 rounded-lg border border-amber-500/20">
                          <div className="text-amber-300">หลบหนี</div>
                          <div className="text-sm font-extrabold text-amber-400">
                            {op.wantedCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="flex items-center gap-1 truncate">
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{op.leadOfficerName}</span>
                      </span>
                      {op.startDate && (
                        <span className="flex items-center gap-1 shrink-0">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{formatThaiDate(op.startDate)}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedDetailOp(op)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 transition cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>ดูภาพรวมเคส & ผู้ต้องหา ({op.totalSuspects})</span>
                      </button>

                      <button
                        onClick={() => handleOpenEdit(op)}
                        className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                        title="แก้ไขข้อมูลเคส"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {!op.isVirtual && (
                        <button
                          onClick={() => {
                            if (
                              window.confirm(
                                `ยืนยันการลบเคส "${op.caseName}" หรือไม่? (ข้อมูลหมายจับในหน้าการจับกุมจะไม่ถูกลบไปด้วย)`
                              )
                            ) {
                              onDeleteOperation(op.id);
                            }
                          }}
                          className="p-2 rounded-xl bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 transition cursor-pointer"
                          title="ลบเคส"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-[#091022]">
                  <th className="p-3 font-semibold">รหัสเคส</th>
                  <th className="p-3 font-semibold">ชื่อเคสคดี</th>
                  <th className="p-3 font-semibold">สถานะเคส</th>
                  <th className="p-3 font-semibold">รายละเอียด / การขยายผล</th>
                  <th className="p-3 font-semibold text-center">ผู้ต้องหาทั้งหมด</th>
                  <th className="p-3 font-semibold text-center text-emerald-400">จับกุมแล้ว</th>
                  <th className="p-3 font-semibold text-center text-amber-400">คงเหลือ</th>
                  <th className="p-3 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredOperations.map((op) => {
                  const stConfig =
                    STATUS_CONFIG[op.status] || STATUS_CONFIG['กำลังสืบสวน'];
                  return (
                    <tr
                      key={op.id}
                      className="hover:bg-[#091022]/80 transition"
                    >
                      <td className="p-3 font-mono text-indigo-300 font-bold">
                        {op.caseCode}
                      </td>
                      <td
                        onClick={() => setSelectedDetailOp(op)}
                        className="p-3 font-bold text-white hover:text-indigo-300 cursor-pointer"
                      >
                        เคส {op.caseName}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${stConfig.badge}`}
                        >
                          {op.status}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="text-slate-200 truncate">{op.details}</div>
                        {op.additionalNotes && (
                          <div className="text-purple-300 text-[11px] truncate mt-0.5">
                            ขยายผล: {op.additionalNotes}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center font-bold text-white">
                        {op.totalSuspects}
                      </td>
                      <td className="p-3 text-center font-bold text-emerald-400">
                        {op.arrestedCount}
                      </td>
                      <td className="p-3 text-center font-bold text-amber-400">
                        {op.wantedCount}
                      </td>
                      <td className="p-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedDetailOp(op)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white font-semibold transition"
                          >
                            ดูเคส
                          </button>
                          <button
                            onClick={() => handleOpenEdit(op)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: CASE DETAIL & LINKED SUSPECTS MODAL */}
      {activeDetailOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0B1328] border border-[#243B6B] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-[#101D3D] to-[#0B1328] border-b border-[#1E2E54] flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-700">
                    {activeDetailOp.caseCode}
                  </span>
                  <h3 className="text-xl font-extrabold text-white">
                    เคส {activeDetailOp.caseName}
                  </h3>
                  <select
                    value={activeDetailOp.status}
                    onChange={(e) =>
                      handleQuickStatusChange(activeDetailOp, e.target.value)
                    }
                    className={`text-xs font-bold px-3 py-1 rounded-full border cursor-pointer ${
                      (
                        STATUS_CONFIG[activeDetailOp.status] ||
                        STATUS_CONFIG['กำลังสืบสวน']
                      ).badge
                    } bg-[#0B1328]`}
                  >
                    {CASE_OPERATION_STATUSES.map((st) => (
                      <option key={st} value={st} className="bg-slate-900 text-white">
                        สถานะ: {st}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  หัวหน้าชุดรับผิดชอบ: <strong className="text-slate-200">{activeDetailOp.leadOfficerName}</strong>
                  {activeDetailOp.startDate && (
                    <> • วันที่เปิดเคส: {formatThaiDate(activeDetailOp.startDate)}</>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleOpenEdit(activeDetailOp);
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>แก้ไขเคส</span>
                </button>
                <button
                  onClick={() => setSelectedDetailOp(null)}
                  className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              {/* Case Details & Additional Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#091022] border border-slate-800">
                  <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 mb-2">
                    <FileText className="w-4 h-4" />
                    <span>รายละเอียดเคส / พฤติการณ์คดี</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                    {activeDetailOp.details || 'ยังไม่มีรายละเอียดเคส'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30">
                  <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5 mb-2">
                    <Sparkles className="w-4 h-4" />
                    <span>รายละเอียดเพิ่มเติม / การสืบสวนขยายผล</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                    {activeDetailOp.additionalNotes ||
                      'ยังไม่มีบันทึกการขยายผลเพิ่มเติม (คลิกปุ่ม "แก้ไขเคส" เพื่อบันทึกความคืบหน้าหรือการขยายผลได้ตลอดเวลา)'}
                  </p>
                </div>
              </div>

              {/* Suspect Statistics Bar inside Modal */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-[#091022] border border-slate-800 text-center">
                  <div className="text-xs text-slate-400">ผู้ต้องหาในเคสนี้ทั้งหมด</div>
                  <div className="text-2xl font-extrabold text-white mt-0.5">
                    {activeDetailOp.totalSuspects} ราย
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-center">
                  <div className="text-xs text-emerald-300">จับกุมแล้ว</div>
                  <div className="text-2xl font-extrabold text-emerald-400 mt-0.5">
                    {activeDetailOp.arrestedCount} ราย ({activeDetailOp.progressPct}%)
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-center">
                  <div className="text-xs text-amber-300">อยู่ระหว่างติดตามจับกุม</div>
                  <div className="text-2xl font-extrabold text-amber-400 mt-0.5">
                    {activeDetailOp.wantedCount} ราย
                  </div>
                </div>
              </div>

              {/* Linked Warrants / Suspects Table */}
              <div className="bg-[#091022] border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-3.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>
                      รายชื่อผู้ต้องหาและหมายจับในเคส "{activeDetailOp.caseName}" (
                      {activeDetailOp.warrants.length} ราย)
                    </span>
                  </h4>

                  {onJumpToArrestsCase && (
                    <button
                      onClick={() => {
                        const targetCase = activeDetailOp.caseName;
                        setSelectedDetailOp(null);
                        onJumpToArrestsCase(targetCase);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer"
                    >
                      <span>เปิดจัดการในหน้าการจับกุม (กรองเคสนี้)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {activeDetailOp.warrants.length > 0 ? (
                  <div className="overflow-x-auto max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50">
                          <th className="p-2.5">ลำดับ</th>
                          <th className="p-2.5">ชื่อ-นามสกุลผู้ต้องหา</th>
                          <th className="p-2.5">เลขบัตรประชาชน</th>
                          <th className="p-2.5">หมายจับ / ศาล</th>
                          <th className="p-2.5">สถานะจับกุม</th>
                          <th className="p-2.5">วันที่จับกุม / สถานที่</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {activeDetailOp.warrants.map((w, idx) => {
                          const isArrested = w.status === 'จับกุมแล้ว';
                          return (
                            <tr key={w.id || idx} className="hover:bg-slate-800/40">
                              <td className="p-2.5 text-slate-400">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-white">
                                {w.suspectName}
                              </td>
                              <td className="p-2.5 font-mono text-slate-300">
                                {w.nationalId || '-'}
                              </td>
                              <td className="p-2.5 text-slate-300">
                                <div>ที่ {w.warrantNumber || '-'}</div>
                                <div className="text-[11px] text-slate-500">
                                  {w.court || ''}
                                </div>
                              </td>
                              <td className="p-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                    isArrested
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {w.status || 'ยังไม่จับกุม'}
                                </span>
                              </td>
                              <td className="p-2.5 text-slate-300 text-[11px]">
                                {isArrested ? (
                                  <div>
                                    <div className="text-emerald-300 font-semibold">
                                      {formatThaiDate(w.arrestDate)}
                                    </div>
                                    <div className="text-slate-400 truncate max-w-[180px]">
                                      {w.arrestLocation || ''}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-500">อยู่ระหว่างติดตามตัว</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    ยังไม่มีรายการหมายจับที่ระบุชื่อเคส "{activeDetailOp.caseName}" —
                    สามารถไปที่เมนู <strong>การจับกุม</strong> แล้วเลือกชื่อเคสเป็น{' '}
                    <strong className="text-indigo-300">"{activeDetailOp.caseName}"</strong>{' '}
                    เพื่อเชื่อมโยงผู้ต้องหาเข้ากับเคสนี้ได้ทันที
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE / EDIT CASE OPERATION MODAL */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0B1328] border border-[#243B6B] rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-[#101D3D] to-[#0B1328] border-b border-[#1E2E54] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FolderKanban className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">
                  {editingOp ? `แก้ไขข้อมูลเคส: ${editingOp.caseName}` : 'สร้างเคสคดีใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    ชื่อเคสคดี (ใช้เชื่อมโยงกับหน้าการจับกุม) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.caseName}
                    onChange={(e) =>
                      setFormData({ ...formData, caseName: e.target.value })
                    }
                    placeholder="เช่น Hybrid, สายลม, บัญชีม้าภาคเหนือ..."
                    className="w-full px-3 py-2 bg-[#091022] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    รหัสเคส
                  </label>
                  <input
                    type="text"
                    value={formData.caseCode}
                    onChange={(e) =>
                      setFormData({ ...formData, caseCode: e.target.value })
                    }
                    placeholder="เช่น TCSD2-2569-01"
                    className="w-full px-3 py-2 bg-[#091022] border border-slate-700 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    สถานะเคส *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#091022] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {CASE_OPERATION_STATUSES.map((st) => (
                      <option key={st} value={st} className="bg-slate-900">
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    หัวหน้าชุดรับผิดชอบ
                  </label>
                  <select
                    value={formData.leadOfficerId}
                    onChange={(e) =>
                      setFormData({ ...formData, leadOfficerId: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#091022] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- เลือกหัวหน้าชุด --</option>
                    {personnel.map((p) => (
                      <option key={p.id} value={p.id} className="bg-slate-900">
                        {p.rank}
                        {p.firstName} {p.lastName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    วันที่เริ่มเคส
                  </label>
                  <DateInput
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-[#091022] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  รายละเอียดเคส / พฤติการณ์คดีโดยสังเขป
                </label>
                <textarea
                  rows={3}
                  value={formData.details}
                  onChange={(e) =>
                    setFormData({ ...formData, details: e.target.value })
                  }
                  placeholder="ระบุพฤติการณ์คดี ความเสียหาย เครือข่ายผู้กระทำผิด หรือเป้าหมายของเคสนี้..."
                  className="w-full px-3 py-2 bg-[#091022] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-300 mb-1">
                  รายละเอียดเพิ่มเติม / บันทึกการขยายผล (เช่น ผลวิเคราะห์เส้นทางการเงิน, เป้าหมายออกหมายจับเพิ่ม)
                </label>
                <textarea
                  rows={3}
                  value={formData.additionalNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, additionalNotes: e.target.value })
                  }
                  placeholder="บันทึกรายละเอียดเพิ่มเติม ความคืบหน้าการขยายผล หรือสิ่งที่ต้องดำเนินการต่อ..."
                  className="w-full px-3 py-2 bg-[#091022] border border-purple-500/40 rounded-xl text-sm text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg"
                >
                  บันทึกข้อมูลเคส
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
