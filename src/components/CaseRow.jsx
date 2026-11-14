import React from 'react';
import { 
  Building2, 
  Clock, 
  Check, 
  Edit3, 
  Trash2, 
  History,
  Send,
  Inbox,
  SearchCheck
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getDeadlineStatus, formatThaiDate } from '../services/storage';

export default function CaseRow({ 
  caseData, 
  currentUser, 
  users, 
  onToggleCheck, 
  onEditCase, 
  onDeleteCase,
  onOpenDetails,
  index 
}) {
  const deadlineInfo = getDeadlineStatus(caseData.deadline);
  const assignedUser = users.find(u => u.id === caseData.assignedTo);
  const isAssignedToCurrent = currentUser?.id === caseData.assignedTo;

  const handleCheckboxClick = (e, field) => {
    e.stopPropagation();
    const newValue = !caseData[field];
    
    if (newValue) {
      let willComplete = false;
      if (field === 'check1_requested' && caseData.check2_received && caseData.check3_verified) willComplete = true;
      if (field === 'check2_received' && caseData.check1_requested && caseData.check3_verified) willComplete = true;
      if (field === 'check3_verified' && caseData.check1_requested && caseData.check2_received) willComplete = true;
      
      if (willComplete) {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
    }

    onToggleCheck(caseData.id, field, newValue);
  };

  const isAllChecked = caseData.check1_requested && caseData.check2_received && caseData.check3_verified;

  return (
    <tr className={`border-b border-[#1E2E54]/50 hover:bg-[#0E1A36]/60 transition ${
      isAllChecked ? 'bg-emerald-950/10' : deadlineInfo.type === 'overdue' ? 'bg-red-950/15' : ''
    }`}>
      
      {/* Index */}
      <td className="px-3 py-3 text-center text-xs font-mono text-slate-400">
        {index + 1}
      </td>

      {/* Title & Doc Number */}
      <td className="px-4 py-3 max-w-xs">
        <div className="flex items-center gap-1.5 flex-wrap mb-1">
          {caseData.docNumber && (
            <span className="font-mono text-[10px] bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded border border-amber-400/30">
              {caseData.docNumber}
            </span>
          )}
          {caseData.priority === 'urgent_most' && (
            <span className="text-[10px] bg-red-600/30 text-red-300 px-1.5 py-0.5 rounded font-bold border border-red-500/40">
              ด่วนที่สุด
            </span>
          )}
        </div>
        <div 
          onClick={() => onOpenDetails(caseData)}
          className="text-xs sm:text-sm font-bold text-white hover:text-amber-400 cursor-pointer transition line-clamp-2"
        >
          {caseData.title}
        </div>
        {caseData.notes && (
          <div className="text-[10px] text-amber-300/80 truncate mt-0.5">
            หมายเหตุ: {caseData.notes}
          </div>
        )}
      </td>

      {/* Target Agency */}
      <td className="px-3 py-3 text-xs text-slate-300 max-w-[160px] truncate">
        {caseData.targetAgency ? (
          <span className="inline-flex items-center gap-1 text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40 truncate text-[11px]">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{caseData.targetAgency}</span>
          </span>
        ) : (
          <span className="text-slate-500">-</span>
        )}
      </td>

      {/* Assignee */}
      <td className="px-3 py-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span>{assignedUser?.avatar || '👮‍♂️'}</span>
          <span className={`font-medium text-[11px] truncate ${
            isAssignedToCurrent ? 'text-amber-400 font-bold' : 'text-slate-300'
          }`}>
            {assignedUser?.name || caseData.assignedToName || '-'}
          </span>
        </div>
      </td>

      {/* Created Date */}
      <td className="px-3 py-3 text-xs font-mono text-slate-400 text-center whitespace-nowrap">
        {formatThaiDate(caseData.createdAt)}
      </td>

      {/* Deadline */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${deadlineInfo.badgeClass}`}>
          <Clock className="w-3 h-3" />
          <span>{deadlineInfo.text}</span>
        </div>
        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
          {formatThaiDate(caseData.deadline)}
        </div>
      </td>

      {/* 3 Step Checkboxes */}
      <td className="px-3 py-3">
        <div className="flex items-center justify-center gap-2">
          
          {/* Step 1 */}
          <button
            type="button"
            onClick={(e) => handleCheckboxClick(e, 'check1_requested')}
            title={caseData.check1_requested ? "1. ขอข้อมูลแล้ว (คลิกเพื่อยกเลิก)" : "คลิกเพื่อติ๊ก: 1. ขอข้อมูลแล้ว"}
            className={`w-6 h-6 rounded flex items-center justify-center border transition ${
              caseData.check1_requested 
                ? 'bg-blue-600 border-blue-500 text-white' 
                : 'bg-slate-800 border-slate-700 text-transparent hover:border-slate-500'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </button>

          {/* Step 2 */}
          <button
            type="button"
            onClick={(e) => handleCheckboxClick(e, 'check2_received')}
            title={caseData.check2_received ? "2. ได้รับแล้ว (คลิกเพื่อยกเลิก)" : "คลิกเพื่อติ๊ก: 2. ได้รับแล้ว"}
            className={`w-6 h-6 rounded flex items-center justify-center border transition ${
              caseData.check2_received 
                ? 'bg-amber-500 border-amber-400 text-slate-950' 
                : 'bg-slate-800 border-slate-700 text-transparent hover:border-slate-500'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </button>

          {/* Step 3 */}
          <button
            type="button"
            onClick={(e) => handleCheckboxClick(e, 'check3_verified')}
            title={caseData.check3_verified ? "3. ตรวจสอบข้อมูลแล้ว (คลิกเพื่อยกเลิก)" : "คลิกเพื่อติ๊ก: 3. ตรวจสอบข้อมูลแล้ว"}
            className={`w-6 h-6 rounded flex items-center justify-center border transition ${
              caseData.check3_verified 
                ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
                : 'bg-slate-800 border-slate-700 text-transparent hover:border-slate-500'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </button>

        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-3 text-center whitespace-nowrap">
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onOpenDetails(caseData)}
            title="ดูรายละเอียด/ไทม์ไลน์"
            className="p-1.5 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
          >
            <History className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onEditCase(caseData)}
            title="แก้ไขงาน"
            className="p-1.5 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          {(currentUser?.role === 'leader' || isAssignedToCurrent) && (
            <button
              onClick={() => onDeleteCase(caseData.id)}
              title="ลบงาน"
              className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </td>

    </tr>
  );
}
