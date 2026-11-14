import React, { useState } from 'react';
import { 
  Clock, 
  Building2, 
  Edit3, 
  Trash2, 
  History,
  Send,
  Inbox,
  SearchCheck,
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { getDeadlineStatus, formatThaiDate } from '../services/storage';

export default function CaseCard({ 
  caseData, 
  currentUser, 
  users, 
  onToggleCheck, 
  onEditCase, 
  onDeleteCase,
  onOpenDetails 
}) {
  const deadlineInfo = getDeadlineStatus(caseData.deadline);
  const assignedUser = users.find(u => u.id === caseData.assignedTo);
  const isAssignedToCurrent = currentUser?.id === caseData.assignedTo;

  const completedChecksCount = [
    caseData.check1_requested, 
    caseData.check2_received, 
    caseData.check3_verified
  ].filter(Boolean).length;

  const isAllChecked = completedChecksCount === 3;

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

  return (
    <div className={`cyber-card rounded-xl overflow-hidden transition-all duration-200 flex flex-col justify-between ${
      isAllChecked 
        ? 'border-emerald-500/40 bg-gradient-to-br from-[#0B1E28] to-[#07131D]' 
        : deadlineInfo.type === 'overdue' 
          ? 'border-red-500/50 bg-gradient-to-br from-[#1C0E14] to-[#0A0D1A]'
          : 'border-blue-900/60'
    }`}>
      
      {/* Top Banner: Badges & Deadline */}
      <div>
        <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-1.5 text-xs">
          
          <div className="flex items-center gap-1.5 flex-wrap">
            {caseData.priority === 'urgent_most' && (
              <span className="px-1.5 py-0.5 rounded font-bold bg-red-600/30 text-red-300 border border-red-500/50 flex items-center gap-1 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                ด่วนที่สุด
              </span>
            )}
            {caseData.priority === 'urgent' && (
              <span className="px-1.5 py-0.5 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px]">
                ด่วนมาก
              </span>
            )}
            {(!caseData.priority || caseData.priority === 'normal') && (
              <span className="px-1.5 py-0.5 rounded font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[10px]">
                ปกติ
              </span>
            )}

            {caseData.docNumber && (
              <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-800/80 text-amber-300 border border-amber-400/30">
                {caseData.docNumber}
              </span>
            )}
            {caseData.category && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/25">
                {caseData.category}
              </span>
            )}
          </div>

          {/* Deadline Countdown */}
          <div className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 shrink-0 ${deadlineInfo.badgeClass}`}>
            <Clock className="w-3 h-3" />
            <span>{deadlineInfo.text}</span>
          </div>

        </div>

        {/* Main Body */}
        <div className="px-4 py-2.5">
          
          {/* Title */}
          <h3 
            onClick={() => onOpenDetails(caseData)}
            className="text-sm font-bold text-white hover:text-amber-400 cursor-pointer transition line-clamp-2 mb-1.5"
          >
            {caseData.title}
          </h3>

          {/* Details */}
          {caseData.details && (
            <p className="text-[11px] text-slate-300/80 line-clamp-2 mb-2.5 bg-[#070D1E]/60 p-2 rounded-lg border border-[#1E2E54]/40 font-light leading-relaxed">
              {caseData.details}
            </p>
          )}
          {(caseData.relatedLinks || caseData.folderId) && (
            <div className="flex flex-wrap items-center gap-2 mb-2 text-[10px] text-sky-300">
              {caseData.relatedLinks && (
                <span className="px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/25 truncate max-w-[200px]">
                  ลิงก์: {caseData.relatedLinks}
                </span>
              )}
              {caseData.folderId && (
                <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/25 font-mono truncate max-w-[140px]">
                  Folder: {caseData.folderId}
                </span>
              )}
            </div>
          )}

          {/* Target Agency */}
          {caseData.targetAgency && (
            <div className="flex items-center gap-1 text-[11px] text-cyan-300 mb-2.5 bg-cyan-950/40 px-2 py-1 rounded-md border border-cyan-800/40 truncate">
              <Building2 className="w-3 h-3 shrink-0 text-cyan-400" />
              <span className="truncate">ขอข้อมูล: <strong>{caseData.targetAgency}</strong></span>
            </div>
          )}

          {/* 3 Interactive Checkboxes */}
          <div className="bg-[#070D1E] p-2.5 rounded-lg border border-blue-900/50 space-y-1.5 mb-2">
            
            <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 border-b border-slate-800 pb-1">
              <span>การติดตามผล 3 ช่อง</span>
              <span className="font-mono text-amber-400">{completedChecksCount}/3 ขั้น</span>
            </div>

            <div className="grid grid-cols-1 gap-1">
              
              {/* Step 1 */}
              <button
                type="button"
                onClick={(e) => handleCheckboxClick(e, 'check1_requested')}
                className={`flex items-center justify-between p-1.5 rounded text-xs transition border ${
                  caseData.check1_requested 
                    ? 'bg-blue-950/80 border-blue-600/60 text-blue-200' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition ${
                    caseData.check1_requested 
                      ? 'bg-blue-600 border-blue-500 text-white' 
                      : 'border-slate-600 bg-slate-800'
                  }`}>
                    {caseData.check1_requested && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-medium">1. ขอข้อมูลแล้ว</span>
                </div>
                <Send className={`w-3 h-3 ${caseData.check1_requested ? 'text-blue-400' : 'text-slate-600'}`} />
              </button>

              {/* Step 2 */}
              <button
                type="button"
                onClick={(e) => handleCheckboxClick(e, 'check2_received')}
                className={`flex items-center justify-between p-1.5 rounded text-xs transition border ${
                  caseData.check2_received 
                    ? 'bg-amber-950/80 border-amber-600/60 text-amber-200' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition ${
                    caseData.check2_received 
                      ? 'bg-amber-500 border-amber-400 text-slate-950' 
                      : 'border-slate-600 bg-slate-800'
                  }`}>
                    {caseData.check2_received && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-medium">2. ได้รับแล้ว</span>
                </div>
                <Inbox className={`w-3 h-3 ${caseData.check2_received ? 'text-amber-400' : 'text-slate-600'}`} />
              </button>

              {/* Step 3 */}
              <button
                type="button"
                onClick={(e) => handleCheckboxClick(e, 'check3_verified')}
                className={`flex items-center justify-between p-1.5 rounded text-xs transition border ${
                  caseData.check3_verified 
                    ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-200' 
                    : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition ${
                    caseData.check3_verified 
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
                      : 'border-slate-600 bg-slate-800'
                  }`}>
                    {caseData.check3_verified && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className="text-[11px] font-medium">3. ตรวจสอบข้อมูลแล้ว</span>
                </div>
                <SearchCheck className={`w-3 h-3 ${caseData.check3_verified ? 'text-emerald-400' : 'text-slate-600'}`} />
              </button>

            </div>

            {/* Micro progress bar */}
            <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
              <div 
                className={`h-full transition-all duration-300 ${
                  isAllChecked 
                    ? 'bg-emerald-500' 
                    : completedChecksCount === 2 
                      ? 'bg-amber-400' 
                      : completedChecksCount === 1 
                        ? 'bg-blue-500' 
                        : 'bg-slate-700'
                }`}
                style={{ width: `${(completedChecksCount / 3) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Note if any */}
          {caseData.notes && (
            <div className="text-[10px] text-amber-200/90 bg-amber-950/30 border border-amber-900/40 px-2 py-1 rounded">
              <strong>หมายเหตุ:</strong> {caseData.notes}
            </div>
          )}

        </div>
      </div>

      {/* Footer Info: Assignee & Action Buttons */}
      <div className="px-4 py-2 bg-[#080E1C] border-t border-[#1E2E54]/70 flex items-center justify-between text-xs">
        
        {/* Assignee */}
        <div className="flex items-center gap-1.5 truncate pr-2">
          <span className="text-sm">{assignedUser?.avatar || '👮‍♂️'}</span>
          <div className="truncate">
            <div className={`font-semibold truncate text-[11px] ${
              isAssignedToCurrent ? 'text-amber-400' : 'text-slate-300'
            }`}>
              {assignedUser?.name || caseData.assignedToName || 'ไม่ระบุ'}
              {isAssignedToCurrent && ' (คุณ)'}
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              เริ่ม: {formatThaiDate(caseData.createdAt)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onOpenDetails(caseData)}
            title="ดูรายละเอียด/ไทม์ไลน์"
            className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition"
          >
            <History className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onEditCase(caseData)}
            title="แก้ไขงาน"
            className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {(currentUser?.role === 'leader' || isAssignedToCurrent) && (
            <button
              onClick={() => onDeleteCase(caseData.id)}
              title="ลบงาน"
              className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>

    </div>
  );
}
