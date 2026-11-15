import React, { useState, useMemo } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Check,
  Sun,
  Moon,
  ArrowUpDown,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  FolderKanban,
  Layers,
  ChevronsDownUp,
  ChevronsUpDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AGENCY_PRESETS } from '../data/initialData';

// Helper to clean old JSON-encoded notes like '[{"text":"...","done":false}]' into readable multi-line text
export function formatCleanNotes(rawNotes) {
  if (!rawNotes) return '';
  const trimmed = String(rawNotes).trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) =>
            typeof item === 'object' && item !== null
              ? item.text || ''
              : String(item)
          )
          .filter(Boolean)
          .join('\n');
      }
    } catch {
      // fall through
    }
  }
  return trimmed;
}

// Format date string into DD/MM/YYYY like 23/09/2026 in the screenshot
export function formatSheetDate(dateStr) {
  if (!dateStr) return '-';
  const s = String(dateStr).trim();
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const dd = slashMatch[1].padStart(2, '0');
    const mm = slashMatch[2].padStart(2, '0');
    const yyyy = slashMatch[3];
    return `${dd}/${mm}/${yyyy}`;
  }
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  return s;
}

// Render text with clickable links for any http:// or https:// URLs
function renderTextWithLinks(text, isRedAlert, isLightMode) {
  if (!text) return '-';
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const lines = String(text).split('\n');

  return lines.map((line, lineIdx) => {
    const parts = line.split(urlRegex);
    return (
      <div key={lineIdx} className="leading-snug break-words">
        {parts.map((part, partIdx) => {
          if (part.match(/^https?:\/\//)) {
            return (
              <a
                key={partIdx}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className={`underline font-medium inline-flex items-center gap-0.5 break-all ${
                  isRedAlert
                    ? isLightMode
                      ? 'text-red-600 hover:text-red-800'
                      : 'text-red-400 hover:text-red-300'
                    : isLightMode
                    ? 'text-blue-700 hover:text-blue-900'
                    : 'text-cyan-400 hover:text-cyan-300'
                }`}
              >
                <span>{part}</span>
              </a>
            );
          }
          return <span key={partIdx}>{part}</span>;
        })}
      </div>
    );
  });
}

export default function TodoSheetTable({
  cases = [],
  users = [],
  personnel = [],
  operations = [],
  currentUser,
  onToggleCheck,
  onSaveCase,
  onEditCase,
  onDeleteCase,
  onOpenDetails
}) {
  const [isLightSheet, setIsLightSheet] = useState(true);
  const [sortOrder, setSortOrder] = useState('sheet_asc'); // 'sheet_asc' | 'newest_first'
  const [groupByCase, setGroupByCase] = useState(true);

  // Track which Case Tabs are collapsed (key = caseGroupName -> boolean)
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Custom new case group name creator
  const [newCaseGroupInput, setNewCaseGroupInput] = useState('');
  const [customGroups, setCustomGroups] = useState([]);

  // Inline editing state
  const [editingRowId, setEditingRowId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  const todayFormatted = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Per-group quick-add drafts (keyed by groupName)
  const [quickAddDrafts, setQuickAddDrafts] = useState({});

  const getDraftForGroup = (groupName) => {
    return (
      quickAddDrafts[groupName] || {
        check1_requested: true,
        check2_received: false,
        check3_verified: false,
        createdAt: todayFormatted(),
        docNumber: '',
        targetAgency: '',
        details: '',
        notes: '',
        channel: '',
        result: '',
        caseName: groupName === 'งานสืบสวนทั่วไป (ยังไม่ระบุเคส)' ? '' : groupName
      }
    );
  };

  const updateDraftForGroup = (groupName, patch) => {
    setQuickAddDrafts((prev) => ({
      ...prev,
      [groupName]: {
        ...getDraftForGroup(groupName),
        ...patch
      }
    }));
  };

  const displayedCases = useMemo(() => {
    return sortOrder === 'newest_first' ? [...cases].reverse() : cases;
  }, [cases, sortOrder]);

  // All known case names for datalist / grouping
  const allKnownCaseNames = useMemo(() => {
    const set = new Set();
    operations.forEach((op) => {
      if (op.caseName && op.caseName.trim()) set.add(op.caseName.trim());
    });
    cases.forEach((c) => {
      const name = (c.caseName || c.title || '').trim();
      if (name) set.add(name);
    });
    customGroups.forEach((g) => {
      if (g.trim()) set.add(g.trim());
    });
    return Array.from(set);
  }, [operations, cases, customGroups]);

  // Build grouped structure by Case Name
  const caseGroups = useMemo(() => {
    if (!groupByCase) {
      return [
        {
          groupName: 'รายการงานสืบสวนทั้งหมด',
          items: displayedCases
        }
      ];
    }

    const map = new Map();

    // Group items by their caseName (fallback to title if caseName not set yet)
    displayedCases.forEach((item) => {
      const gName =
        (item.caseName || '').trim() ||
        (item.title || '').trim() ||
        'งานสืบสวนทั่วไป (ยังไม่ระบุเคส)';
      if (!map.has(gName)) {
        map.set(gName, []);
      }
      map.get(gName).push(item);
    });

    // Also include any custom group added by user in this session
    customGroups.forEach((gName) => {
      if (gName && !map.has(gName)) {
        map.set(gName, []);
      }
    });

    return Array.from(map.entries()).map(([groupName, items]) => ({
      groupName,
      items
    }));
  }, [displayedCases, groupByCase, customGroups]);

  const toggleGroupCollapse = (groupName) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const expandAllGroups = () => setCollapsedGroups({});
  const collapseAllGroups = () => {
    const next = {};
    caseGroups.forEach((g) => {
      next[g.groupName] = true;
    });
    setCollapsedGroups(next);
  };

  const handleAddCaseTab = (e) => {
    e.preventDefault();
    const trimmed = newCaseGroupInput.trim();
    if (!trimmed) return;
    if (!customGroups.includes(trimmed)) {
      setCustomGroups((prev) => [...prev, trimmed]);
    }
    setCollapsedGroups((prev) => ({ ...prev, [trimmed]: false }));
    setNewCaseGroupInput('');
  };

  const handleCheckboxToggle = (e, item, field) => {
    e.stopPropagation();
    const nextVal = !item[field];
    if (nextVal) {
      const c1 =
        field === 'check1_requested' ? nextVal : !!item.check1_requested;
      const c2 = field === 'check2_received' ? nextVal : !!item.check2_received;
      const c3 = field === 'check3_verified' ? nextVal : !!item.check3_verified;
      if (c1 && c2 && c3) {
        confetti({ particleCount: 55, spread: 60, origin: { y: 0.65 } });
      }
    }
    onToggleCheck(item.id, field, nextVal);
  };

  const startInlineEdit = (item) => {
    setEditingRowId(item.id);
    setEditDraft({
      createdAt:
        formatSheetDate(item.createdAt) === '-'
          ? todayFormatted()
          : formatSheetDate(item.createdAt),
      docNumber: item.docNumber || '',
      targetAgency: item.targetAgency || '',
      details: item.details || item.title || '',
      notes: formatCleanNotes(item.notes),
      channel: item.channel || '',
      result: item.result || '',
      caseName: item.caseName || item.title || ''
    });
  };

  const saveInlineEdit = async (item) => {
    if (!onSaveCase) return;
    const updated = {
      ...item,
      caseName: (editDraft.caseName || '').trim(),
      title:
        (editDraft.caseName || '').trim() ||
        (editDraft.details || item.title || 'รายการขอข้อมูล')
          .split('\n')[0]
          .slice(0, 120),
      details: editDraft.details,
      createdAt: editDraft.createdAt,
      docNumber: editDraft.docNumber,
      targetAgency: editDraft.targetAgency,
      notes: editDraft.notes,
      channel: editDraft.channel,
      result: editDraft.result
    };
    await onSaveCase(updated);
    setEditingRowId(null);
  };

  const handleQuickAddRow = async (groupName) => {
    const draft = getDraftForGroup(groupName);
    if (
      !draft.details.trim() &&
      !draft.targetAgency.trim() &&
      !draft.docNumber.trim()
    ) {
      return;
    }
    if (!onSaveCase) return;

    const effectiveCaseName =
      groupByCase && groupName !== 'งานสืบสวนทั่วไป (ยังไม่ระบุเคส)'
        ? groupName
        : (draft.caseName || '').trim();

    const firstLine = (
      effectiveCaseName ||
      draft.details ||
      draft.targetAgency ||
      'รายการขอข้อมูลใหม่'
    )
      .split('\n')[0]
      .trim();

    let status = 'in_progress';
    if (
      draft.check1_requested &&
      draft.check2_received &&
      draft.check3_verified
    ) {
      status = 'completed';
    } else if (draft.check1_requested && !draft.check2_received) {
      status = 'waiting_agency';
    }

    const payload = {
      id: `case-${Date.now()}`,
      caseName: effectiveCaseName,
      title: firstLine,
      details: draft.details.trim() || firstLine,
      category: 'งานสืบสวน',
      createdAt: draft.createdAt || todayFormatted(),
      docNumber: draft.docNumber.trim(),
      targetAgency: draft.targetAgency.trim(),
      notes: draft.notes.trim(),
      channel: draft.channel.trim(),
      result: draft.result.trim(),
      assignedTo: currentUser?.id || 'usr-masteradmin',
      assignedToName: currentUser?.name || 'ทีมงาน',
      coAssignees: [],
      priority: 'normal',
      status,
      check1_requested: !!draft.check1_requested,
      check2_received: !!draft.check2_received,
      check3_verified: !!draft.check3_verified,
      relatedFiles: [],
      relatedLinks: '[]',
      folderId: '',
      history: []
    };

    await onSaveCase(payload);

    const nextNo =
      draft.docNumber && /^\d+$/.test(draft.docNumber.trim())
        ? String(Number(draft.docNumber.trim()) + 1)
        : '';

    updateDraftForGroup(groupName, {
      check1_requested: true,
      check2_received: false,
      check3_verified: false,
      docNumber: nextNo,
      targetAgency: '',
      details: '',
      notes: '',
      channel: '',
      result: ''
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Control & Legend Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 p-3 rounded-xl bg-[#0B142A] border border-[#1E2E54] text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-bold text-slate-300">สัญลักษณ์สีแถว:</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
            <span>สีน้ำเงิน = ขอแล้ว (รอผลตอบกลับ)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" />
            <span>ตัวอักษรสีแดง = ได้รับแล้ว แต่ยังไม่ได้ดูไฟล์!</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
            <span>สีเขียว = ดูไฟล์เรียบร้อยแล้ว</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Create new Case Group Tab */}
          {groupByCase && (
            <form
              onSubmit={handleAddCaseTab}
              className="flex items-center gap-1 bg-[#070D1E] px-2 py-1 rounded-lg border border-indigo-500/40"
            >
              <input
                type="text"
                list="case-group-names-list"
                value={newCaseGroupInput}
                onChange={(e) => setNewCaseGroupInput(e.target.value)}
                placeholder="+ ชื่อเคสใหม่เพื่อแยกแท็บ..."
                className="bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none w-36 sm:w-44"
              />
              <button
                type="submit"
                className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] cursor-pointer"
              >
                เพิ่มแท็บเคส
              </button>
            </form>
          )}

          {groupByCase && caseGroups.length > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={expandAllGroups}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                title="ขยายเปิดทุกแท็บเคส"
              >
                <ChevronsUpDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>ขยายทั้งหมด</span>
              </button>
              <button
                type="button"
                onClick={collapseAllGroups}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                title="ย่อปิดทุกแท็บเคส"
              >
                <ChevronsDownUp className="w-3.5 h-3.5 text-amber-400" />
                <span>ย่อทั้งหมด</span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setGroupByCase((v) => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition cursor-pointer font-semibold ${
              groupByCase
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{groupByCase ? 'แยกแท็บตามชื่อเคส' : 'รวมตารางเดียว'}</span>
          </button>

          <button
            type="button"
            onClick={() =>
              setSortOrder((prev) =>
                prev === 'sheet_asc' ? 'newest_first' : 'sheet_asc'
              )
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {sortOrder === 'sheet_asc'
                ? 'เรียงต่อท้ายตาม Sheet'
                : 'ล่าสุดขึ้นก่อน'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsLightSheet((v) => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
          >
            {isLightSheet ? (
              <>
                <Moon className="w-3.5 h-3.5 text-cyan-400" />
                <span>โหมดมืด</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>โหมด Sheet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Render Collapsible Case Group Boxes */}
      <div className="space-y-4">
        {caseGroups.map(({ groupName, items }) => {
          const isCollapsed = !!collapsedGroups[groupName];
          const totalInGroup = items.length;
          const requestedCount = items.filter((i) => i.check1_requested).length;
          const receivedCount = items.filter((i) => i.check2_received).length;
          const verifiedCount = items.filter((i) => i.check3_verified).length;
          const unverifiedAlertCount = items.filter(
            (i) => i.check2_received && !i.check3_verified
          ).length;

          const draft = getDraftForGroup(groupName);

          return (
            <div
              key={groupName}
              className={`rounded-xl overflow-hidden border shadow-xl transition ${
                isLightSheet
                  ? 'border-emerald-800/70 bg-white text-slate-900'
                  : 'border-[#1E2E54] bg-[#070D1E] text-slate-100'
              }`}
            >
              {/* CASE TAB HEADER BAR (กล่องรวมเป็นแท็บบนหัวคอลัมน์ กดเปิด-ปิด ย่อ/ขยายได้) */}
              <div
                onClick={() => toggleGroupCollapse(groupName)}
                className="px-4 py-2.5 bg-gradient-to-r from-[#0F2447] via-[#142E59] to-[#0E203E] text-white flex flex-wrap items-center justify-between gap-2 cursor-pointer select-none border-b border-emerald-700/50 hover:brightness-110 transition"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                  <FolderKanban className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-extrabold tracking-wide text-amber-300 truncate">
                    เคส: {groupName}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800/90 text-slate-200 border border-slate-600">
                    {totalInGroup} รายการ
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {unverifiedAlertCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-bold animate-pulse">
                      ⚠️ ได้รับแล้วแต่ยังไม่ได้ดูไฟล์ {unverifiedAlertCount} รายการ
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-700/50">
                    ขอแล้ว: <strong>{requestedCount}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-700/50">
                    ได้รับแล้ว: <strong>{receivedCount}</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-700/50">
                    ดูไฟล์แล้ว: <strong>{verifiedCount}</strong>
                  </span>
                  <span className="text-[10px] text-slate-300 ml-1">
                    {isCollapsed ? '[คลิกเพื่อขยายตาราง]' : '[คลิกเพื่อย่อตาราง]'}
                  </span>
                </div>
              </div>

              {/* Collapsible Table Body */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#1f7a4c] text-white font-bold text-[11px] sm:text-xs select-none">
                        {/* เรียงตามคำสั่งผู้ใช้: ขอแล้ว (ซ้ายสุด) -> ได้รับแล้ว -> ดูไฟล์แล้ว */}
                        <th className="py-2.5 px-2 text-center border-r border-emerald-600/50 w-16 whitespace-nowrap">
                          ขอแล้ว
                        </th>
                        <th className="py-2.5 px-2 text-center border-r border-emerald-600/50 w-16 whitespace-nowrap">
                          ได้รับแล้ว
                        </th>
                        <th className="py-2.5 px-2 text-center border-r border-emerald-600/50 w-16 whitespace-nowrap">
                          ดูไฟล์แล้ว
                        </th>
                        <th className="py-2.5 px-2.5 text-center border-r border-emerald-600/50 w-24 whitespace-nowrap">
                          วันที่ขอ
                        </th>
                        <th className="py-2.5 px-2 text-center border-r border-emerald-600/50 w-16 whitespace-nowrap">
                          No.
                        </th>
                        <th className="py-2.5 px-3 text-center border-r border-emerald-600/50 w-36 whitespace-nowrap">
                          ปลายทาง
                        </th>
                        <th className="py-2.5 px-3 text-left border-r border-emerald-600/50 min-w-[260px]">
                          ข้อมูล
                        </th>
                        <th className="py-2.5 px-3 text-center border-r border-emerald-600/50 min-w-[170px]">
                          หมายเหตุ
                        </th>
                        <th className="py-2.5 px-3 text-center border-r border-emerald-600/50 w-36 whitespace-nowrap">
                          ช่องทาง
                        </th>
                        <th className="py-2.5 px-3 text-center border-r border-emerald-600/50 w-32 whitespace-nowrap">
                          ผล
                        </th>
                        <th className="py-2.5 px-2 text-center w-20 whitespace-nowrap">
                          จัดการ
                        </th>
                      </tr>
                    </thead>

                    <tbody
                      className={
                        isLightSheet
                          ? 'divide-y divide-slate-300/80'
                          : 'divide-y divide-slate-800/80'
                      }
                    >
                      {items.map((item, idx) => {
                        const cRequested = !!item.check1_requested;
                        const cReceived = !!item.check2_received;
                        const cVerified = !!item.check3_verified;

                        const isRedAlert = cReceived && !cVerified;
                        const isWaitingBlue = !cReceived && cRequested;
                        const isGreenDone = cReceived && cVerified;

                        let rowBgClass = '';
                        let textColorClass = '';
                        let checkboxColorClass = '';

                        if (isLightSheet) {
                          if (isWaitingBlue) {
                            rowBgClass = 'bg-[#d9e5f8] hover:bg-[#c9daf5]';
                            textColorClass = 'text-slate-900';
                            checkboxColorClass =
                              'bg-blue-600 border-blue-700 text-white';
                          } else if (isRedAlert) {
                            rowBgClass = 'bg-[#dff0d8] hover:bg-[#d2e8c9]';
                            textColorClass = 'text-[#d91e18] font-medium';
                            checkboxColorClass =
                              'bg-[#e61919] border-[#c41212] text-white';
                          } else if (isGreenDone) {
                            rowBgClass = 'bg-[#dff0d8] hover:bg-[#d2e8c9]';
                            textColorClass = 'text-slate-900';
                            checkboxColorClass =
                              'bg-[#3c763d] border-[#2e5c2f] text-white';
                          } else {
                            rowBgClass = 'bg-[#eef6ea] hover:bg-[#e2eedc]';
                            textColorClass = 'text-slate-900';
                            checkboxColorClass =
                              'bg-[#3c763d] border-[#2e5c2f] text-white';
                          }
                        } else {
                          if (isWaitingBlue) {
                            rowBgClass = 'bg-blue-950/35 hover:bg-blue-900/40';
                            textColorClass = 'text-blue-100';
                            checkboxColorClass =
                              'bg-blue-600 border-blue-500 text-white';
                          } else if (isRedAlert) {
                            rowBgClass =
                              'bg-emerald-950/25 hover:bg-emerald-900/30';
                            textColorClass = 'text-red-400 font-medium';
                            checkboxColorClass =
                              'bg-red-600 border-red-500 text-white';
                          } else {
                            rowBgClass =
                              'bg-emerald-950/20 hover:bg-emerald-900/30';
                            textColorClass = 'text-slate-100';
                            checkboxColorClass =
                              'bg-emerald-600 border-emerald-500 text-white';
                          }
                        }

                        const uncheckedBorderClass = isRedAlert
                          ? 'border-red-600 bg-transparent'
                          : isWaitingBlue
                          ? 'border-blue-600 bg-transparent'
                          : isLightSheet
                          ? 'border-emerald-800/70 bg-transparent'
                          : 'border-slate-500 bg-transparent';

                        const isEditingThisRow = editingRowId === item.id;
                        const cleanNotes = formatCleanNotes(item.notes);
                        const mainDataText = item.details || item.title || '';

                        if (isEditingThisRow) {
                          return (
                            <tr
                              key={item.id}
                              className={
                                isLightSheet
                                  ? 'bg-amber-50 text-slate-900'
                                  : 'bg-slate-900 text-white'
                              }
                            >
                              {/* 1. ขอแล้ว (ซ้ายสุด) */}
                              <td className="py-2 px-2 text-center border-r border-slate-300/60">
                                <input
                                  type="checkbox"
                                  checked={cRequested}
                                  onChange={(e) =>
                                    handleCheckboxToggle(
                                      e,
                                      item,
                                      'check1_requested'
                                    )
                                  }
                                  className="w-4 h-4 cursor-pointer"
                                />
                              </td>
                              {/* 2. ได้รับแล้ว */}
                              <td className="py-2 px-2 text-center border-r border-slate-300/60">
                                <input
                                  type="checkbox"
                                  checked={cReceived}
                                  onChange={(e) =>
                                    handleCheckboxToggle(
                                      e,
                                      item,
                                      'check2_received'
                                    )
                                  }
                                  className="w-4 h-4 cursor-pointer"
                                />
                              </td>
                              {/* 3. ดูไฟล์แล้ว */}
                              <td className="py-2 px-2 text-center border-r border-slate-300/60">
                                <input
                                  type="checkbox"
                                  checked={cVerified}
                                  onChange={(e) =>
                                    handleCheckboxToggle(
                                      e,
                                      item,
                                      'check3_verified'
                                    )
                                  }
                                  className="w-4 h-4 cursor-pointer"
                                />
                              </td>

                              {/* วันที่ขอ */}
                              <td className="p-1.5 border-r border-slate-300/60">
                                <input
                                  type="text"
                                  value={editDraft.createdAt}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      createdAt: e.target.value
                                    })
                                  }
                                  placeholder="DD/MM/YYYY"
                                  className="w-full px-1.5 py-1 rounded border border-indigo-400 text-xs text-center bg-white text-slate-900"
                                />
                              </td>

                              {/* No. */}
                              <td className="p-1.5 border-r border-slate-300/60">
                                <input
                                  type="text"
                                  value={editDraft.docNumber}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      docNumber: e.target.value
                                    })
                                  }
                                  placeholder="1487"
                                  className="w-full px-1.5 py-1 rounded border border-indigo-400 text-xs text-center font-mono bg-white text-slate-900"
                                />
                              </td>

                              {/* ปลายทาง */}
                              <td className="p-1.5 border-r border-slate-300/60">
                                <input
                                  type="text"
                                  list="agency-presets-sheet"
                                  value={editDraft.targetAgency}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      targetAgency: e.target.value
                                    })
                                  }
                                  placeholder="เช่น Facebook, TRUE"
                                  className="w-full px-2 py-1 rounded border border-indigo-400 text-xs bg-white text-slate-900"
                                />
                              </td>

                              {/* ข้อมูล + ชื่อเคส */}
                              <td className="p-1.5 border-r border-slate-300/60 space-y-1">
                                <input
                                  type="text"
                                  list="case-group-names-list"
                                  value={editDraft.caseName}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      caseName: e.target.value
                                    })
                                  }
                                  placeholder="ชื่อเคส (เพื่อจัดกลุ่มแท็บ)"
                                  className="w-full px-2 py-0.5 rounded border border-amber-500 text-[11px] font-bold bg-amber-50 text-slate-900"
                                />
                                <textarea
                                  rows={2}
                                  value={editDraft.details}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      details: e.target.value
                                    })
                                  }
                                  placeholder="รายละเอียดข้อมูล / URL / หมายเลขอ้างอิง"
                                  className="w-full px-2 py-1 rounded border border-indigo-400 text-xs bg-white text-slate-900"
                                />
                              </td>

                              {/* หมายเหตุ */}
                              <td className="p-1.5 border-r border-slate-300/60">
                                <textarea
                                  rows={2}
                                  value={editDraft.notes}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      notes: e.target.value
                                    })
                                  }
                                  placeholder="หมายเหตุ"
                                  className="w-full px-2 py-1 rounded border border-indigo-400 text-xs bg-white text-slate-900"
                                />
                              </td>

                              {/* ช่องทาง */}
                              <td className="p-1.5 border-r border-slate-300/60">
                                <input
                                  type="text"
                                  value={editDraft.channel}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      channel: e.target.value
                                    })
                                  }
                                  placeholder="เช่น ส่งไลน์ / Case:..."
                                  className="w-full px-2 py-1 rounded border border-indigo-400 text-xs bg-white text-slate-900"
                                />
                              </td>

                              {/* ผล */}
                              <td className="p-1.5 border-r border-slate-300/60">
                                <input
                                  type="text"
                                  value={editDraft.result}
                                  onChange={(e) =>
                                    setEditDraft({
                                      ...editDraft,
                                      result: e.target.value
                                    })
                                  }
                                  placeholder="ผลที่ได้..."
                                  className="w-full px-2 py-1 rounded border border-indigo-400 text-xs bg-white text-slate-900"
                                />
                              </td>

                              {/* ปุ่มบันทึก/ยกเลิก */}
                              <td className="p-1.5 text-center whitespace-nowrap">
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => saveInlineEdit(item)}
                                    className="p-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white"
                                    title="บันทึกแถวนี้"
                                  >
                                    <Save className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingRowId(null)}
                                    className="p-1.5 rounded bg-slate-600 hover:bg-slate-500 text-white"
                                    title="ยกเลิก"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={item.id}
                            onDoubleClick={() => startInlineEdit(item)}
                            className={`transition align-middle ${rowBgClass} ${textColorClass}`}
                            title="ดับเบิลคลิกที่แถวเพื่อแก้ไขข้อมูลในตารางทันที"
                          >
                            {/* 1. ขอแล้ว (ซ้ายสุด) */}
                            <td
                              onClick={(e) =>
                                handleCheckboxToggle(
                                  e,
                                  item,
                                  'check1_requested'
                                )
                              }
                              className={`py-2 px-2 text-center border-r cursor-pointer ${
                                isLightSheet
                                  ? 'border-slate-300/70'
                                  : 'border-slate-800'
                              }`}
                            >
                              <button
                                type="button"
                                className={`w-4 h-4 rounded-[3px] border-2 inline-flex items-center justify-center transition ${
                                  cRequested
                                    ? checkboxColorClass
                                    : uncheckedBorderClass
                                }`}
                              >
                                {cRequested && (
                                  <Check className="w-3 h-3 stroke-[3.5]" />
                                )}
                              </button>
                            </td>

                            {/* 2. ได้รับแล้ว */}
                            <td
                              onClick={(e) =>
                                handleCheckboxToggle(e, item, 'check2_received')
                              }
                              className={`py-2 px-2 text-center border-r cursor-pointer ${
                                isLightSheet
                                  ? 'border-slate-300/70'
                                  : 'border-slate-800'
                              }`}
                            >
                              <button
                                type="button"
                                className={`w-4 h-4 rounded-[3px] border-2 inline-flex items-center justify-center transition ${
                                  cReceived
                                    ? checkboxColorClass
                                    : uncheckedBorderClass
                                }`}
                              >
                                {cReceived && (
                                  <Check className="w-3 h-3 stroke-[3.5]" />
                                )}
                              </button>
                            </td>

                            {/* 3. ดูไฟล์แล้ว */}
                            <td
                              onClick={(e) =>
                                handleCheckboxToggle(e, item, 'check3_verified')
                              }
                              className={`py-2 px-2 text-center border-r cursor-pointer ${
                                isLightSheet
                                  ? 'border-slate-300/70'
                                  : 'border-slate-800'
                              }`}
                            >
                              <button
                                type="button"
                                className={`w-4 h-4 rounded-[3px] border-2 inline-flex items-center justify-center transition ${
                                  cVerified
                                    ? checkboxColorClass
                                    : uncheckedBorderClass
                                }`}
                              >
                                {cVerified && (
                                  <Check className="w-3 h-3 stroke-[3.5]" />
                                )}
                              </button>
                            </td>

                            {/* 4. วันที่ขอ */}
                            <td
                              className={`py-2 px-2 text-center font-mono whitespace-nowrap border-r ${
                                isLightSheet
                                  ? 'border-slate-300/70'
                                  : 'border-slate-800'
                              }`}
                            >
                              {formatSheetDate(item.createdAt)}
                            </td>

                            {/* 5. No. */}
                            <td
                              className={`py-2 px-2 text-center font-mono font-bold whitespace-nowrap border-r ${
                                isLightSheet
                                  ? 'border-slate-300/70'
                                  : 'border-slate-800'
                              }`}
                            >
                              {item.docNumber || idx + 1}
                            </td>

                            {/* 6. ปลายทาง */}
                            <td
                              className={`py-2 px-2.5 text-center font-semibold border-r ${
                                isLightSheet
                                  ? 'border-slate-300/70'
                                  : 'border-slate-800'
                              }`}
                            >
                              {item.targetAgency || item.category || '-'}
                            </td>

                            {/* 7. ข้อมูล */}
                            <td
                              onClick={() =>
                                onOpenDetails && onOpenDetails(item)
                              }
                              className={`py-2 px-3 text-left border-r cursor-pointer ${
                                isLightSheet
                                  ? 'border-slate-300/70'
                                  : 'border-slate-800'
                              }`}
                            >
                              {renderTextWithLinks(
                                mainDataText,
                                isRedAlert,
                                isLightSheet
                              )}
                            </td>

                            {/* 8. หมายเหตุ */}
                            <td
                              className={`py-2 px-2.5 text-left whitespace-pre-line border-r ${
                                isLightSheet
                                  ? 'border-slate-300/70'
                                  : 'border-slate-800'
                              }`}
                            >
                              {cleanNotes || '-'}
                            </td>

                            {/* 9. ช่องทาง */}
                            <td
                              className={`py-2 px-2.5 text-left whitespace-pre-line border-r ${
                                isLightSheet
                                  ? 'border-slate-300/70'
                                  : 'border-slate-800'
                              }`}
                            >
                              {item.channel || item.assignedToName || '-'}
                            </td>

                            {/* 10. ผล */}
                            <td
                              className={`py-2 px-2.5 text-left whitespace-pre-line border-r ${
                                isLightSheet
                                  ? 'border-slate-300/70'
                                  : 'border-slate-800'
                              }`}
                            >
                              {item.result || '-'}
                            </td>

                            {/* 11. จัดการ */}
                            <td className="py-1.5 px-2 text-center whitespace-nowrap">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => startInlineEdit(item)}
                                  className={`p-1 rounded transition cursor-pointer ${
                                    isLightSheet
                                      ? 'hover:bg-black/10 text-slate-700'
                                      : 'hover:bg-slate-800 text-slate-300'
                                  }`}
                                  title="แก้ไขในแถวทันที"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onDeleteCase && onDeleteCase(item.id)
                                  }
                                  className={`p-1 rounded transition cursor-pointer ${
                                    isLightSheet
                                      ? 'hover:bg-red-100 text-red-700'
                                      : 'hover:bg-red-950/60 text-red-400'
                                  }`}
                                  title="ลบแถวนี้"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {/* QUICK ADD ROW AT THE BOTTOM OF THIS CASE TAB */}
                      <tr
                        className={
                          isLightSheet
                            ? 'bg-emerald-50/90 border-t-2 border-emerald-700/60 text-slate-900'
                            : 'bg-[#0D1836] border-t-2 border-indigo-500/50 text-white'
                        }
                      >
                        {/* 1. ขอแล้ว (ซ้ายสุด) */}
                        <td className="py-2 px-2 text-center border-r border-slate-300/60">
                          <input
                            type="checkbox"
                            checked={draft.check1_requested}
                            onChange={(e) =>
                              updateDraftForGroup(groupName, {
                                check1_requested: e.target.checked
                              })
                            }
                            className="w-4 h-4 cursor-pointer"
                            title="ขอแล้ว"
                          />
                        </td>
                        {/* 2. ได้รับแล้ว */}
                        <td className="py-2 px-2 text-center border-r border-slate-300/60">
                          <input
                            type="checkbox"
                            checked={draft.check2_received}
                            onChange={(e) =>
                              updateDraftForGroup(groupName, {
                                check2_received: e.target.checked
                              })
                            }
                            className="w-4 h-4 cursor-pointer"
                            title="ได้รับแล้ว"
                          />
                        </td>
                        {/* 3. ดูไฟล์แล้ว */}
                        <td className="py-2 px-2 text-center border-r border-slate-300/60">
                          <input
                            type="checkbox"
                            checked={draft.check3_verified}
                            onChange={(e) =>
                              updateDraftForGroup(groupName, {
                                check3_verified: e.target.checked
                              })
                            }
                            className="w-4 h-4 cursor-pointer"
                            title="ดูไฟล์แล้ว"
                          />
                        </td>

                        {/* วันที่ขอ */}
                        <td className="p-1.5 border-r border-slate-300/60">
                          <input
                            type="text"
                            value={draft.createdAt}
                            onChange={(e) =>
                              updateDraftForGroup(groupName, {
                                createdAt: e.target.value
                              })
                            }
                            placeholder="DD/MM/YYYY"
                            className="w-full px-1.5 py-1 rounded border border-emerald-600/50 text-xs text-center bg-white text-slate-900"
                          />
                        </td>

                        {/* No. */}
                        <td className="p-1.5 border-r border-slate-300/60">
                          <input
                            type="text"
                            value={draft.docNumber}
                            onChange={(e) =>
                              updateDraftForGroup(groupName, {
                                docNumber: e.target.value
                              })
                            }
                            placeholder="No."
                            className="w-full px-1.5 py-1 rounded border border-emerald-600/50 text-xs text-center font-mono bg-white text-slate-900"
                          />
                        </td>

                        {/* ปลายทาง */}
                        <td className="p-1.5 border-r border-slate-300/60">
                          <input
                            type="text"
                            list="agency-presets-sheet"
                            value={draft.targetAgency}
                            onChange={(e) =>
                              updateDraftForGroup(groupName, {
                                targetAgency: e.target.value
                              })
                            }
                            placeholder="+ ปลายทาง (เช่น Facebook, TRUE)"
                            className="w-full px-2 py-1 rounded border border-emerald-600/50 text-xs bg-white text-slate-900"
                          />
                        </td>

                        {/* ข้อมูล */}
                        <td className="p-1.5 border-r border-slate-300/60">
                          <textarea
                            rows={1}
                            value={draft.details}
                            onChange={(e) =>
                              updateDraftForGroup(groupName, {
                                details: e.target.value
                              })
                            }
                            placeholder={`+ เพิ่มข้อมูลที่ขอในเคส "${groupName}" ต่อท้าย...`}
                            className="w-full px-2 py-1 rounded border border-emerald-600/50 text-xs bg-white text-slate-900"
                          />
                        </td>

                        {/* หมายเหตุ */}
                        <td className="p-1.5 border-r border-slate-300/60">
                          <input
                            type="text"
                            value={draft.notes}
                            onChange={(e) =>
                              updateDraftForGroup(groupName, {
                                notes: e.target.value
                              })
                            }
                            placeholder="หมายเหตุ"
                            className="w-full px-2 py-1 rounded border border-emerald-600/50 text-xs bg-white text-slate-900"
                          />
                        </td>

                        {/* ช่องทาง */}
                        <td className="p-1.5 border-r border-slate-300/60">
                          <input
                            type="text"
                            value={draft.channel}
                            onChange={(e) =>
                              updateDraftForGroup(groupName, {
                                channel: e.target.value
                              })
                            }
                            placeholder="ช่องทาง / Case:..."
                            className="w-full px-2 py-1 rounded border border-emerald-600/50 text-xs bg-white text-slate-900"
                          />
                        </td>

                        {/* ผล */}
                        <td className="p-1.5 border-r border-slate-300/60">
                          <input
                            type="text"
                            value={draft.result}
                            onChange={(e) =>
                              updateDraftForGroup(groupName, {
                                result: e.target.value
                              })
                            }
                            placeholder="ผล"
                            className="w-full px-2 py-1 rounded border border-emerald-600/50 text-xs bg-white text-slate-900"
                          />
                        </td>

                        {/* ปุ่มเพิ่มต่อท้าย */}
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleQuickAddRow(groupName)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1f7a4c] hover:bg-emerald-600 text-white font-bold text-[11px] shadow cursor-pointer whitespace-nowrap"
                            title="เพิ่มแถวใหม่ต่อท้ายรายการล่าสุดในเคสนี้"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>เพิ่มแถว</span>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <datalist id="case-group-names-list">
        {allKnownCaseNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <datalist id="agency-presets-sheet">
        <option value="Facebook" />
        <option value="Facebook Ads" />
        <option value="HOSTINGER" />
        <option value="NameCheap" />
        <option value="MAT BAO" />
        <option value="STRIPE" />
        <option value="Flash Express (Flash Pay)" />
        <option value="TRUE" />
        <option value="AIS" />
        <option value="DTAC" />
        <option value="LINE" />
        <option value="Google" />
        <option value="TikTok" />
        {(AGENCY_PRESETS || []).map((ag) => (
          <option key={ag} value={ag} />
        ))}
      </datalist>
    </div>
  );
}
