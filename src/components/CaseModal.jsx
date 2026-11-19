import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Save, 
  Send, 
  Inbox, 
  SearchCheck, 
  Building2, 
  FileText, 
  Clock, 
  History, 
  Check, 
  Plus,
  Link2,
  Trash2,
  Users
} from 'lucide-react';
import { AGENCY_PRESETS, TASK_CATEGORIES } from '../data/initialData';
import DateInput, { getTodayDMY, toDMY } from './DateInput';
import CaseNameSelect from './CaseNameSelect';

export default function CaseModal({ 
  isOpen, 
  onClose, 
  caseData, 
  onSave, 
  currentUser, 
  users,
  personnel = [],
  operations = []
}) {
  const [activeTab, setActiveTab] = useState('form');
  
  const [title, setTitle] = useState('');
  const [caseName, setCaseName] = useState('');
  const [category, setCategory] = useState('งานสืบสวน');
  const [docNumber, setDocNumber] = useState('');
  const [details, setDetails] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('normal');
  const [status, setStatus] = useState('in_progress');
  const [targetAgency, setTargetAgency] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [coAssignees, setCoAssignees] = useState([]);
  const [relatedLinks, setRelatedLinks] = useState([]);
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [folderId, setFolderId] = useState('');
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);
  const [notes, setNotes] = useState('');
  const [channel, setChannel] = useState('');
  const [result, setResult] = useState('');
  const [newLogNote, setNewLogNote] = useState('');
  const initializedCaseRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      initializedCaseRef.current = null;
      return;
    }
    const targetKey = caseData ? (caseData.id || 'editing') : 'new';
    if (initializedCaseRef.current === targetKey) {
      return;
    }
    initializedCaseRef.current = targetKey;

    if (caseData) {
      setTitle(caseData.title || '');
      setCaseName(caseData.caseName || '');
      setCategory(caseData.category || 'งานสืบสวน');
      setDocNumber(caseData.docNumber || '');
      setDetails(caseData.details || '');
      setCreatedAt(toDMY(caseData.createdAt) || getTodayDMY());
      setDeadline(toDMY(caseData.deadline) || '');
      setPriority(caseData.priority || 'normal');
      setStatus(caseData.status || 'in_progress');
      setTargetAgency(caseData.targetAgency || '');
      setAssignedTo(caseData.assignedTo || currentUser?.id || users[0]?.id || '');
      setCoAssignees(Array.isArray(caseData.coAssignees) ? caseData.coAssignees : []);
      setRelatedLinks(Array.isArray(caseData.relatedLinks) ? caseData.relatedLinks : []);
      setFolderId(caseData.folderId || '');
      setCheck1(!!caseData.check1_requested);
      setCheck2(!!caseData.check2_received);
      setCheck3(!!caseData.check3_verified);
      let cleanedNotes = caseData.notes || '';
      if (typeof cleanedNotes === 'string' && cleanedNotes.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(cleanedNotes);
          if (Array.isArray(parsed)) {
            cleanedNotes = parsed.map(x => x?.text || '').filter(Boolean).join('\n');
          }
        } catch {
          // ignore
        }
      }
      setNotes(cleanedNotes);
      setChannel(caseData.channel || '');
      setResult(caseData.result || '');
    } else {
      setTitle('');
      setCaseName('');
      setCategory('งานสืบสวน');
      setDocNumber('');
      setDetails('');
      setCreatedAt(getTodayDMY());
      
      const d = new Date();
      d.setDate(d.getDate() + 7);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      setDeadline(`${dd}/${mm}/${yyyy}`);
      
      setPriority('normal');
      setStatus('in_progress');
      setTargetAgency('');
      setAssignedTo(currentUser?.id || users[0]?.id || '');
      setCoAssignees([]);
      setRelatedLinks([]);
      setFolderId('');
      setCheck1(false);
      setCheck2(false);
      setCheck3(false);
      setNotes('');
      setChannel('');
      setResult('');
    }
    setActiveTab('form');
    setNewLogNote('');
    setNewLinkLabel('');
    setNewLinkUrl('');
  }, [isOpen, caseData?.id]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('กรุณากรอกชื่องาน / คดีสืบสวน');
      return;
    }

    const assignedUserObj = users.find(u => u.id === assignedTo);
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const timestampStr = `${dd}/${mm}/${yyyy} ${timeStr} น.`;
    
    let history = caseData?.history ? [...caseData.history] : [];
    
    if (!caseData) {
      history.push({
        id: `hist-${Date.now()}`,
        timestamp: timestampStr,
        userId: currentUser?.id,
        userName: currentUser?.name || 'เจ้าหน้าที่',
        action: 'สร้างงานสืบสวนใหม่',
        details: `เปิดสำนวนงาน: ${title}`
      });
    } else {
      const changes = [];
      if (check1 !== caseData.check1_requested) changes.push(`1.ขอข้อมูลแล้ว: ${check1 ? '✓ ติ๊กเลือก' : 'ยกเลิก'}`);
      if (check2 !== caseData.check2_received) changes.push(`2.ได้รับแล้ว: ${check2 ? '✓ ติ๊กเลือก' : 'ยกเลิก'}`);
      if (check3 !== caseData.check3_verified) changes.push(`3.ตรวจสอบข้อมูลแล้ว: ${check3 ? '✓ ติ๊กเลือก' : 'ยกเลิก'}`);
      if (assignedTo !== caseData.assignedTo) changes.push(`เปลี่ยนผู้รับผิดชอบเป็น: ${assignedUserObj?.name || assignedTo}`);

      if (changes.length > 0) {
        history.unshift({
          id: `hist-${Date.now()}`,
          timestamp: timestampStr,
          userId: currentUser?.id,
          userName: currentUser?.name || 'เจ้าหน้าที่',
          action: 'อัปเดตสถานะงาน',
          details: changes.join(', ')
        });
      }
    }

    const payload = {
      ...(caseData || {}),
      id: caseData?.id || `case-${Date.now()}`,
      title: title.trim(),
      caseName: caseName.trim(),
      category,
      docNumber: docNumber.trim(),
      details: details.trim(),
      createdAt,
      deadline,
      priority,
      status: (check1 && check2 && check3) ? 'completed' : status,
      targetAgency: targetAgency.trim(),
      assignedTo,
      assignedToName: assignedUserObj?.name || 'ไม่ระบุ',
      coAssignees,
      relatedLinks,
      folderId: folderId.trim(),
      check1_requested: check1,
      check2_received: check2,
      check3_verified: check3,
      notes: notes.trim(),
      channel: channel.trim(),
      result: result.trim(),
      history
    };

    onSave(payload);
    onClose();
  };

  const handleAddLogNote = () => {
    if (!newLogNote.trim() || !caseData) return;
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    const timestampStr = `${dd}/${mm}/${yyyy} ${timeStr} น.`;
    
    const newEntry = {
      id: `hist-${Date.now()}`,
      timestamp: timestampStr,
      userId: currentUser?.id,
      userName: currentUser?.name || 'เจ้าหน้าที่',
      action: 'บันทึกความคืบหน้า',
      details: newLogNote.trim()
    };

    const updatedHistory = [newEntry, ...(caseData.history || [])];
    onSave({ ...caseData, history: updatedHistory });
    setNewLogNote('');
  };

  const handleAddAgencyPreset = (preset) => {
    if (!targetAgency) {
      setTargetAgency(preset);
    } else if (!targetAgency.includes(preset)) {
      setTargetAgency(`${targetAgency}, ${preset}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl my-6 bg-[#0B142B] border border-blue-900/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-4 py-3 bg-[#080E1E] border-b border-[#1E2E54] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>{caseData ? 'แก้ไขงานในความรับผิดชอบ (To-Do)' : 'เพิ่มงานในความรับผิดชอบ (To-Do)'}</span>
                {caseData?.docNumber && (
                  <span className="text-[10px] font-mono bg-blue-950 text-amber-300 px-1.5 py-0.2 rounded border border-blue-800">
                    {caseData.docNumber}
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-slate-400">
                บก.ปอท. กองบัญชาการตำรวจสอบสวนกลาง (CIB)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        {caseData && (
          <div className="flex border-b border-[#1E2E54] bg-[#070D1E] px-4">
            <button
              onClick={() => setActiveTab('form')}
              className={`py-2 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                activeTab === 'form'
                  ? 'border-amber-400 text-amber-400 bg-amber-400/5'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>ข้อมูลคดีและสถานะ 3 ช่อง</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-3 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-cyan-400 text-cyan-400 bg-cyan-400/5'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>ประวัติไทม์ไลน์ ({caseData?.history?.length || 0})</span>
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3.5">
          
          {activeTab === 'form' ? (
            <form id="caseForm" onSubmit={handleSubmit} className="space-y-3">
              
              {/* Title */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  ชื่องาน / คดีสืบสวน <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="เช่น สืบสวนเครือข่ายหลอกลงทุน Hybrid Scam ตรวจสอบบัญชีม้า"
                  className="w-full px-3 py-2 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Linked Operation Case Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  ชื่อเคสที่เชื่อมโยง (เชื่อมกับชีท &quot;เคสคดี&quot;)
                </label>
                <CaseNameSelect
                  value={caseName}
                  onChange={setCaseName}
                  operations={operations}
                  placeholder="คลิกเลือกเคสจากรายการ หรือพิมพ์เพื่อค้นหา..."
                  className="w-full pl-3 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-cyan-200 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition"
                />
              </div>

              {/* Doc Number, Category & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    หมวดหมู่งาน <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {TASK_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    เลขที่หนังสือราชการ (ตช ...)
                  </label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="ตช 0026.3/1429"
                    className="w-full px-3 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    ระดับความเร่งด่วน
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="normal">ปกติ (Normal)</option>
                    <option value="urgent">⚡ ด่วนมาก (Urgent)</option>
                    <option value="urgent_most">🚨 ด่วนที่สุด (Critical)</option>
                  </select>
                </div>
              </div>

              {/* Target Agency */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    หน่วยงานปลายทางที่ขอข้อมูล
                  </span>
                  <span className="text-[10px] text-slate-400">คลิกชิปเพื่อเลือกด่วน</span>
                </label>
                <input
                  type="text"
                  value={targetAgency}
                  onChange={(e) => setTargetAgency(e.target.value)}
                  placeholder="เช่น ธนาคารกสิกรไทย, AIS, True, ปปง., Bitkub"
                  className="w-full px-3 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-cyan-300 focus:outline-none focus:border-amber-400 mb-1.5"
                />

                {/* Quick Agency Chips */}
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-[#070D1E]/60 rounded-lg border border-[#1E2E54]/50">
                  {AGENCY_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddAgencyPreset(preset.split(' ')[0])}
                      className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950/80 hover:bg-amber-400 hover:text-slate-950 text-slate-300 border border-blue-800/40 transition cursor-pointer"
                    >
                      + {preset.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates & Assignee */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    วันที่เริ่มสืบสวน
                  </label>
                  <DateInput
                    value={createdAt}
                    onChange={(e) => setCreatedAt(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    วันครบกำหนด (Deadline)
                  </label>
                  <DateInput
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    ผู้รับผิดชอบสำนวน
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    {users
                      .filter(u => u.role === 'investigator' || u.role === 'leader')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.badge})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* 3 Tracking Checkboxes */}
              <div className="p-3 rounded-lg bg-[#070D1E] border border-amber-400/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                    สถานะการติดตาม 3 ช่อง (3 Steps)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    คลิกเพื่ออัปเดตความคืบหน้า
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  
                  {/* Step 1 */}
                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                    check1 
                      ? 'bg-blue-950/80 border-blue-500 text-blue-200' 
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={check1}
                      onChange={(e) => setCheck1(e.target.checked)}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                      check1 ? 'bg-blue-600 border-blue-400 text-white' : 'border-slate-600 bg-slate-800'
                    }`}>
                      {check1 && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold">1. ขอข้อมูลแล้ว</div>
                      <div className="text-[9px] text-slate-400">ส่งหนังสือราชการ</div>
                    </div>
                  </label>

                  {/* Step 2 */}
                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                    check2 
                      ? 'bg-amber-950/80 border-amber-500 text-amber-200' 
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={check2}
                      onChange={(e) => setCheck2(e.target.checked)}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                      check2 ? 'bg-amber-500 border-amber-400 text-slate-950' : 'border-slate-600 bg-slate-800'
                    }`}>
                      {check2 && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold">2. ได้รับแล้ว</div>
                      <div className="text-[9px] text-slate-400">ได้เอกสาร/Log ครบ</div>
                    </div>
                  </label>

                  {/* Step 3 */}
                  <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                    check3 
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' 
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}>
                    <input
                      type="checkbox"
                      checked={check3}
                      onChange={(e) => setCheck3(e.target.checked)}
                      className="hidden"
                    />
                    <div className={`w-4 h-4 rounded flex items-center justify-center border transition ${
                      check3 ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-600 bg-slate-800'
                    }`}>
                      {check3 && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold">3. ตรวจสอบแล้ว</div>
                      <div className="text-[9px] text-slate-400">วิเคราะห์เสร็จสิ้น</div>
                    </div>
                  </label>

                </div>
              </div>

              {/* Details */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  รายละเอียดพฤติการณ์ / ประเด็นการสืบสวน
                </label>
                <textarea
                  rows={2}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="ระบุข้อเท็จจริง เลขบัญชีเป้าหมาย ชื่อผู้เสียหาย หรือประเด็นที่ต้องสืบสวน..."
                  className="w-full px-3 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                ></textarea>
              </div>

              {/* Notes, Channel, Result */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    หมายเหตุ (Notes)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="เช่น ขอรายละเอียดเพิ่มเติม / 1. LAMER"
                    className="w-full px-3 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-amber-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    ช่องทาง (Channel / Case ID)
                  </label>
                  <input
                    type="text"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    placeholder="เช่น ส่งไลน์พี่ต่าย / Case:25442983"
                    className="w-full px-3 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-cyan-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    ผล (Result)
                  </label>
                  <input
                    type="text"
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    placeholder="เช่น ชื่อผู้จดทะเบียน / ***ยกเลิก"
                    className="w-full px-3 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-xs text-emerald-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Co-Assignees (ผู้ร่วมรับผิดชอบ) */}
              {(personnel.length > 0 || users.length > 0) && (
                <div className="p-3 rounded-lg bg-[#070D1E] border border-blue-900/50 space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>ผู้ร่วมรับผิดชอบ (คลิกเลือกได้หลายคน)</span>
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(personnel.length > 0 ? personnel : users)
                      .filter((p) => p.id !== assignedTo)
                      .map((p) => {
                        const label = p.firstName ? `${p.prefix || ''}${p.firstName} ${p.lastName || ''}`.trim() : p.name;
                        const active = coAssignees.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() =>
                              setCoAssignees((prev) =>
                                active ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                              )
                            }
                            className={`text-[10px] px-2 py-1 rounded-md border transition cursor-pointer ${
                              active
                                ? 'bg-cyan-600/30 border-cyan-400 text-cyan-200 font-bold'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                          >
                            {active ? '✓ ' : '+ '}{label}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Related Links & Google Drive Folder */}
              <div className="p-3 rounded-lg bg-[#070D1E] border border-blue-900/50 space-y-2">
                <label className="block text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>ไฟล์และลิงก์ที่เกี่ยวข้อง (Google Drive / เอกสาร)</span>
                </label>

                <input
                  type="text"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  placeholder="Google Drive Folder URL หรือ Folder ID (ถ้ามี)"
                  className="w-full px-2.5 py-1.5 bg-[#0A1224] rounded-lg border border-slate-700 text-xs text-cyan-300 font-mono focus:outline-none focus:border-amber-400"
                />

                <div className="flex flex-col sm:flex-row gap-1.5">
                  <input
                    type="text"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    placeholder="ชื่อลิงก์ (เช่น โฟลเดอร์หลักฐาน)"
                    className="sm:w-1/3 px-2.5 py-1.5 bg-[#0A1224] rounded-lg border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <input
                    type="url"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="flex-1 px-2.5 py-1.5 bg-[#0A1224] rounded-lg border border-slate-700 text-xs text-cyan-300 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newLinkUrl.trim()) return;
                      setRelatedLinks((prev) => [
                        ...prev,
                        { label: newLinkLabel.trim() || 'เอกสาร/ลิงก์แนบ', url: newLinkUrl.trim() }
                      ]);
                      setNewLinkLabel('');
                      setNewLinkUrl('');
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer"
                  >
                    + เพิ่มลิงก์
                  </button>
                </div>

                {relatedLinks.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {relatedLinks.map((lnk, idx) => (
                      <div key={idx} className="flex items-center justify-between px-2.5 py-1 rounded bg-[#0A1224] border border-blue-900/40 text-[11px]">
                        <a
                          href={lnk.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-300 hover:underline truncate pr-2"
                        >
                          🔗 {lnk.label}
                        </a>
                        <button
                          type="button"
                          onClick={() => setRelatedLinks((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-red-400 hover:text-red-300 p-0.5"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </form>
          ) : (
            /* Timeline */
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-[#070D1E] border border-blue-900/60">
                <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  เพิ่มบันทึกความคืบหน้าการสืบสวนลงไทม์ไลน์
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newLogNote}
                    onChange={(e) => setNewLogNote(e.target.value)}
                    placeholder="พิมพ์ความคืบหน้า เช่น โทรติดตามฝ่ายไอที ทราบว่าจะส่งมอบข้อมูล..."
                    className="flex-1 px-3 py-1.5 bg-[#0A1224] rounded-lg border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLogNote();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddLogNote}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>บันทึก</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 relative pl-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-900/60">
                {caseData?.history && caseData.history.length > 0 ? (
                  caseData.history.map((item, idx) => (
                    <div key={item.id || idx} className="relative group">
                      <div className="absolute -left-5 top-1.5 w-2 h-2 rounded-full bg-amber-400 border-2 border-[#0B142B]"></div>
                      <div className="p-2.5 rounded-lg bg-[#070D1E] border border-blue-900/40">
                        <div className="flex items-center justify-between text-[10px] mb-0.5">
                          <span className="font-bold text-amber-300">{item.userName || 'เจ้าหน้าที่'}</span>
                          <span className="text-slate-500 font-mono">{item.timestamp}</span>
                        </div>
                        <div className="text-xs font-semibold text-white">{item.action}</div>
                        {item.details && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{item.details}</div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-xs text-slate-500">
                    ยังไม่มีประวัติการบันทึกในสำนวนนี้
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#080E1E] border-t border-[#1E2E54] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition"
          >
            ยกเลิก
          </button>

          {activeTab === 'form' && (
            <button
              type="submit"
              form="caseForm"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>บันทึกข้อมูลสำนวนคดี</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
