import React, { useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  ExternalLink,
  Check,
  Sun,
  Moon,
  ArrowUpDown,
  Save,
  X
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
          .map((item) => (typeof item === 'object' && item !== null ? item.text || '' : String(item)))
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
  // If already DD/MM/YYYY or D/M/YYYY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const dd = slashMatch[1].padStart(2, '0');
    const mm = slashMatch[2].padStart(2, '0');
    const yyyy = slashMatch[3];
    return `${dd}/${mm}/${yyyy}`;
  }
  // If YYYY-MM-DD
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
  // Default to Light Sheet mode (matches the user's screenshot colors!) with 1-click toggle to Dark mode
  const [isLightSheet, setIsLightSheet] = useState(true);
  const [sortOrder, setSortOrder] = useState('sheet_asc'); // 'sheet_asc' (เรียงต่อท้ายตามลำดับแถว) | 'newest_first'

  // Inline editing state
  const [editingRowId, setEditingRowId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  // Quick-add row state at bottom of table
  const todayFormatted = () => {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const [newRow, setNewRow] = useState({
    check2_received: false,
    check1_requested: true,
    check3_verified: false,
    createdAt: todayFormatted(),
    docNumber: '',
    targetAgency: '',
    details: '',
    notes: '',
    channel: '',
    result: '',
    caseName: ''
  });

  const displayedCases =
    sortOrder === 'newest_first' ? [...cases].reverse() : cases;

  const handleCheckboxToggle = (e, item, field) => {
    e.stopPropagation();
    const nextVal = !item[field];
    if (nextVal) {
      const c1 = field === 'check1_requested' ? nextVal : !!item.check1_requested;
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
      createdAt: formatSheetDate(item.createdAt) === '-' ? todayFormatted() : formatSheetDate(item.createdAt),
      docNumber: item.docNumber || '',
      targetAgency: item.targetAgency || '',
      details: item.details || item.title || '',
      notes: formatCleanNotes(item.notes),
      channel: item.channel || '',
      result: item.result || '',
      caseName: item.caseName || ''
    });
  };

  const saveInlineEdit = async (item) => {
    if (!onSaveCase) return;
    const updated = {
      ...item,
      title: (editDraft.details || item.title || 'รายการขอข้อมูล').split('\n')[0].slice(0, 120),
      details: editDraft.details,
      createdAt: editDraft.createdAt,
      docNumber: editDraft.docNumber,
      targetAgency: editDraft.targetAgency,
      notes: editDraft.notes,
      channel: editDraft.channel,
      result: editDraft.result,
      caseName: editDraft.caseName
    };
    await onSaveCase(updated);
    setEditingRowId(null);
  };

  const handleQuickAddRow = async (e) => {
    e.preventDefault();
    if (!newRow.details.trim() && !newRow.targetAgency.trim() && !newRow.docNumber.trim()) {
      return;
    }
    if (!onSaveCase) return;

    const firstLine = (newRow.details || newRow.targetAgency || 'รายการขอข้อมูลใหม่')
      .split('\n')[0]
      .trim();

    let status = 'in_progress';
    if (newRow.check1_requested && newRow.check2_received && newRow.check3_verified) {
      status = 'completed';
    } else if (newRow.check1_requested && !newRow.check2_received) {
      status = 'waiting_agency';
    }

    const payload = {
      id: `case-${Date.now()}`,
      title: firstLine,
      details: newRow.details.trim() || firstLine,
      category: 'งานสืบสวน',
      createdAt: newRow.createdAt || todayFormatted(),
      docNumber: newRow.docNumber.trim(),
      targetAgency: newRow.targetAgency.trim(),
      notes: newRow.notes.trim(),
      channel: newRow.channel.trim(),
      result: newRow.result.trim(),
      caseName: newRow.caseName.trim(),
      assignedTo: currentUser?.id || 'usr-masteradmin',
      assignedToName: currentUser?.name || 'ทีมงาน',
      coAssignees: [],
      priority: 'normal',
      status,
      check1_requested: !!newRow.check1_requested,
      check2_received: !!newRow.check2_received,
      check3_verified: !!newRow.check3_verified,
      relatedFiles: [],
      relatedLinks: '[]',
      folderId: '',
      history: []
    };

    await onSaveCase(payload);

    // Increment No. automatically if numeric
    const nextNo =
      newRow.docNumber && /^\d+$/.test(newRow.docNumber.trim())
        ? String(Number(newRow.docNumber.trim()) + 1)
        : '';

    setNewRow({
      check2_received: false,
      check1_requested: true,
      check3_verified: false,
      createdAt: newRow.createdAt || todayFormatted(),
      docNumber: nextNo,
      targetAgency: '',
      details: '',
      notes: '',
      channel: '',
      result: '',
      caseName: newRow.caseName
    });
  };

  return (
    <div className="space-y-3">
      {/* Top Control & Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#0B142A] border border-[#1E2E54] text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-300">สัญลักษณ์สีสถานะแถว:</span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
            <span>สีน้ำเงิน = ขอแล้ว (รอผลตอบกลับ)</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" />
            <span>ตัวอักษรสีแดง = ได้รับแล้ว แต่ยังไม่ได้เปิดดูไฟล์!</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
            <span>สีเขียว = ได้รับแล้ว / ดูไฟล์แล้ว</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setSortOrder((prev) =>
                prev === 'sheet_asc' ? 'newest_first' : 'sheet_asc'
              )
            }
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
            title="สลับลำดับการแสดงผล"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {sortOrder === 'sheet_asc'
                ? 'เรียงตามแถว Sheet (เก่า → ใหม่ ต่อท้าย)'
                : 'เรียงรายการล่าสุดขึ้นก่อน'}
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
                <span>สลับโหมดมืด</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>สลับโหมดตาราง Sheet</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Spreadsheet-like Table */}
      <div
        className={`rounded-xl overflow-hidden border shadow-xl ${
          isLightSheet
            ? 'border-emerald-800/60 bg-white text-slate-900'
            : 'border-[#1E2E54] bg-[#070D1E] text-slate-100'
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#1f7a4c] text-white font-bold text-[11px] sm:text-xs select-none">
                <th className="py-2.5 px-2 text-center border-r border-emerald-600/50 w-16 whitespace-nowrap">
                  ได้รับแล้ว
                </th>
                <th className="py-2.5 px-2 text-center border-r border-emerald-600/50 w-14 whitespace-nowrap">
                  ขอแล้ว
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
              {displayedCases.map((item, idx) => {
                const cReceived = !!item.check2_received;
                const cRequested = !!item.check1_requested;
                const cVerified = !!item.check3_verified;

                // Visual state logic matching the user's screenshot:
                // 1) Received + Requested but NOT Verified yet -> RED text & RED checkboxes (like rows 1478, 1479, 1480)
                //    Wait: in the screenshot, rows 1478-1480 have [✓] ได้รับแล้ว, [✓] ขอแล้ว, [ ] ดูไฟล์แล้ว and are RED!
                //    And if a row is newly Received without being Viewed, making it Red when item.priority === 'urgent_most' or (!cVerified && cReceived) highlights uninspected files!
                const isRedAlert = cReceived && !cVerified;
                const isWaitingBlue = !cReceived && cRequested;
                const isGreenDone = cReceived && cVerified;

                // Row background classes
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
                    rowBgClass = 'bg-emerald-950/25 hover:bg-emerald-900/30';
                    textColorClass = 'text-red-400 font-medium';
                    checkboxColorClass = 'bg-red-600 border-red-500 text-white';
                  } else {
                    rowBgClass = 'bg-emerald-950/20 hover:bg-emerald-900/30';
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
                      {/* 3 Checkboxes */}
                      <td className="py-2 px-2 text-center border-r border-slate-300/60">
                        <input
                          type="checkbox"
                          checked={cReceived}
                          onChange={(e) =>
                            handleCheckboxToggle(e, item, 'check2_received')
                          }
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-300/60">
                        <input
                          type="checkbox"
                          checked={cRequested}
                          onChange={(e) =>
                            handleCheckboxToggle(e, item, 'check1_requested')
                          }
                          className="w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="py-2 px-2 text-center border-r border-slate-300/60">
                        <input
                          type="checkbox"
                          checked={cVerified}
                          onChange={(e) =>
                            handleCheckboxToggle(e, item, 'check3_verified')
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

                      {/* ข้อมูล */}
                      <td className="p-1.5 border-r border-slate-300/60">
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
                          placeholder="หมายเหตุ / ชื่อเคสย่อย"
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
                    {/* 1. ได้รับแล้ว */}
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
                          cReceived ? checkboxColorClass : uncheckedBorderClass
                        }`}
                      >
                        {cReceived && <Check className="w-3 h-3 stroke-[3.5]" />}
                      </button>
                    </td>

                    {/* 2. ขอแล้ว */}
                    <td
                      onClick={(e) =>
                        handleCheckboxToggle(e, item, 'check1_requested')
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
                          cRequested ? checkboxColorClass : uncheckedBorderClass
                        }`}
                      >
                        {cRequested && (
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
                          cVerified ? checkboxColorClass : uncheckedBorderClass
                        }`}
                      >
                        {cVerified && <Check className="w-3 h-3 stroke-[3.5]" />}
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
                      onClick={() => onOpenDetails && onOpenDetails(item)}
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
                          onClick={() => onDeleteCase && onDeleteCase(item.id)}
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

              {/* QUICK ADD ROW AT THE BOTTOM (เพิ่มแถวใหม่ต่อท้ายรายการล่าสุด) */}
              <tr
                className={
                  isLightSheet
                    ? 'bg-emerald-50/90 border-t-2 border-emerald-700/60 text-slate-900'
                    : 'bg-[#0D1836] border-t-2 border-indigo-500/50 text-white'
                }
              >
                <td className="py-2 px-2 text-center border-r border-slate-300/60">
                  <input
                    type="checkbox"
                    checked={newRow.check2_received}
                    onChange={(e) =>
                      setNewRow({ ...newRow, check2_received: e.target.checked })
                    }
                    className="w-4 h-4 cursor-pointer"
                    title="ได้รับแล้ว"
                  />
                </td>
                <td className="py-2 px-2 text-center border-r border-slate-300/60">
                  <input
                    type="checkbox"
                    checked={newRow.check1_requested}
                    onChange={(e) =>
                      setNewRow({
                        ...newRow,
                        check1_requested: e.target.checked
                      })
                    }
                    className="w-4 h-4 cursor-pointer"
                    title="ขอแล้ว"
                  />
                </td>
                <td className="py-2 px-2 text-center border-r border-slate-300/60">
                  <input
                    type="checkbox"
                    checked={newRow.check3_verified}
                    onChange={(e) =>
                      setNewRow({ ...newRow, check3_verified: e.target.checked })
                    }
                    className="w-4 h-4 cursor-pointer"
                    title="ดูไฟล์แล้ว"
                  />
                </td>

                {/* วันที่ขอ */}
                <td className="p-1.5 border-r border-slate-300/60">
                  <input
                    type="text"
                    value={newRow.createdAt}
                    onChange={(e) =>
                      setNewRow({ ...newRow, createdAt: e.target.value })
                    }
                    placeholder="DD/MM/YYYY"
                    className="w-full px-1.5 py-1 rounded border border-emerald-600/50 text-xs text-center bg-white text-slate-900"
                  />
                </td>

                {/* No. */}
                <td className="p-1.5 border-r border-slate-300/60">
                  <input
                    type="text"
                    value={newRow.docNumber}
                    onChange={(e) =>
                      setNewRow({ ...newRow, docNumber: e.target.value })
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
                    value={newRow.targetAgency}
                    onChange={(e) =>
                      setNewRow({ ...newRow, targetAgency: e.target.value })
                    }
                    placeholder="+ ปลายทาง (เช่น Facebook, TRUE)"
                    className="w-full px-2 py-1 rounded border border-emerald-600/50 text-xs bg-white text-slate-900"
                  />
                </td>

                {/* ข้อมูล */}
                <td className="p-1.5 border-r border-slate-300/60">
                  <textarea
                    rows={1}
                    value={newRow.details}
                    onChange={(e) =>
                      setNewRow({ ...newRow, details: e.target.value })
                    }
                    placeholder="+ พิมพ์ข้อมูลที่ขอ / URL / เลขอ้างอิง เพื่อเพิ่มต่อท้ายตาราง..."
                    className="w-full px-2 py-1 rounded border border-emerald-600/50 text-xs bg-white text-slate-900"
                  />
                </td>

                {/* หมายเหตุ */}
                <td className="p-1.5 border-r border-slate-300/60">
                  <input
                    type="text"
                    value={newRow.notes}
                    onChange={(e) =>
                      setNewRow({ ...newRow, notes: e.target.value })
                    }
                    placeholder="หมายเหตุ"
                    className="w-full px-2 py-1 rounded border border-emerald-600/50 text-xs bg-white text-slate-900"
                  />
                </td>

                {/* ช่องทาง */}
                <td className="p-1.5 border-r border-slate-300/60">
                  <input
                    type="text"
                    value={newRow.channel}
                    onChange={(e) =>
                      setNewRow({ ...newRow, channel: e.target.value })
                    }
                    placeholder="ช่องทาง / Case:..."
                    className="w-full px-2 py-1 rounded border border-emerald-600/50 text-xs bg-white text-slate-900"
                  />
                </td>

                {/* ผล */}
                <td className="p-1.5 border-r border-slate-300/60">
                  <input
                    type="text"
                    value={newRow.result}
                    onChange={(e) =>
                      setNewRow({ ...newRow, result: e.target.value })
                    }
                    placeholder="ผล"
                    className="w-full px-2 py-1 rounded border border-emerald-600/50 text-xs bg-white text-slate-900"
                  />
                </td>

                {/* ปุ่มเพิ่มต่อท้าย */}
                <td className="p-1.5 text-center">
                  <button
                    type="button"
                    onClick={handleQuickAddRow}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1f7a4c] hover:bg-emerald-600 text-white font-bold text-[11px] shadow cursor-pointer whitespace-nowrap"
                    title="เพิ่มแถวใหม่ต่อท้ายรายการล่าสุด"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มแถว</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

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
