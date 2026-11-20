import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  FileWarning,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Save,
  Link as LinkIcon,
  Upload,
  ClipboardPaste,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import {
  WARRANT_OWNER_OPTIONS,
  WARRANT_STATUS_OPTIONS,
  THAI_PROVINCES
} from '../data/initialData';
import { calculateAge, normalizeImageUrl } from '../services/storage';
import DateInput, { getTodayDMY } from './DateInput';
import FileDropzone from './FileDropzone';
import CaseNameSelect from './CaseNameSelect';

const EMPTY_WARRANT = {
  folderId: '',
  linkedCaseId: '',
  caseName: '',
  court: 'ศาลอาญา',
  warrantNumber: '',
  issueDate: getTodayDMY(),
  charge: '',
  owner: 'หมายจับภายใน',
  gender: 'ชาย',
  prefix: 'นาย',
  firstName: '',
  lastName: '',
  dob: '',
  age: '',
  nationalId: '',
  role: '',
  notes: '',
  houseNo: '',
  moo: '',
  road: '',
  subdistrict: '',
  district: '',
  province: 'กรุงเทพมหานคร',
  warrantFileUrl: '',
  personPhotoUrl: '',
  houseRegUrl: '',
  naraiRegUrl: '',
  relatedFiles: [],
  relatedLinks: [],
  status: 'หลบหนี',
  assignedTo: ''
};

export default function WarrantModal({
  isOpen,
  onClose,
  onSave,
  editingWarrant = null,
  cases = [],
  operations = [],
  warrants = [],
  users = []
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(EMPTY_WARRANT);
  const [linksText, setLinksText] = useState('');
  const [dragActiveField, setDragActiveField] = useState(null);
  const [pasteNoticeField, setPasteNoticeField] = useState(null);
  const [savedNextNotice, setSavedNextNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const initializedKeyRef = useRef(null);

  const readImageFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1280;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => resolve(ev.target.result);
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const showPasteSuccess = (field) => {
    setPasteNoticeField(field);
    setTimeout(() => {
      setPasteNoticeField((prev) => (prev === field ? null : prev));
    }, 1800);
  };

  const handleImageFileForField = async (field, file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const dataUrl = await readImageFileAsDataUrl(file);
    updateField(field, dataUrl);
    showPasteSuccess(field);
  };

  const handlePasteEventForField = async (e, field) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type && item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleImageFileForField(field, file);
          return;
        }
      }
    }
  };

  const handleClipboardButtonForField = async (field) => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            const file = new File([blob], `clipboard_${Date.now()}.png`, { type: imgType });
            await handleImageFileForField(field, file);
            return;
          }
        }
      }
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = (await navigator.clipboard.readText()).trim();
        if (text) {
          updateField(field, text);
          showPasteSuccess(field);
          return;
        }
      }
      alert('ไม่พบรูปภาพหรือข้อความใน Clipboard (สามารถคลิกที่กรอบแล้วกด Ctrl+V เพื่อวางรูปได้ทันที)');
    } catch {
      alert('กรุณาคลิกที่กรอบช่องนี้แล้วกดปุ่ม Ctrl+V บนคีย์บอร์ดเพื่อวางรูปจาก Clipboard');
    }
  };

  useEffect(() => {
    if (!isOpen) {
      initializedKeyRef.current = null;
      return;
    }
    const targetKey = editingWarrant ? (editingWarrant.id || 'editing') : 'new';
    if (initializedKeyRef.current === targetKey) {
      return;
    }
    initializedKeyRef.current = targetKey;

    setStep(1);
    if (editingWarrant) {
      setFormData({ ...EMPTY_WARRANT, ...editingWarrant });
      setLinksText(
        Array.isArray(editingWarrant.relatedLinks)
          ? editingWarrant.relatedLinks.join('\n')
          : editingWarrant.relatedLinks || ''
      );
    } else {
      setFormData({
        ...EMPTY_WARRANT,
        assignedTo: users[0]?.id || ''
      });
      setLinksText('');
    }
  }, [isOpen, editingWarrant?.id]);

  if (!isOpen) return null;

  const updateField = (field, value) => {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'dob') {
        const computed = calculateAge(value);
        if (computed !== '') next.age = computed;
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (!formData.firstName.trim() && !formData.warrantNumber.trim() && !formData.caseName.trim()) {
      alert('กรุณากรอกอย่างน้อย ชื่อผู้ต้องหา หรือ ชื่อเคส หรือ เลขที่หมายจับ');
      return;
    }
    const linksArr = linksText
      .split(/\n|,/)
      .map(s => s.trim())
      .filter(Boolean);
    try {
      setIsSaving(true);
      await onSave({
        ...formData,
        age: formData.age === '' ? '' : Number(formData.age),
        relatedLinks: linksArr
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const incrementWarrantNumber = (numStr) => {
    const m = String(numStr || '').trim().match(/^(\d+)(\/.*)?$/);
    if (!m) return '';
    return `${Number(m[1]) + 1}${m[2] || ''}`;
  };

  const handleSaveAndNext = () => {
    if (!formData.firstName.trim() && !formData.warrantNumber.trim() && !formData.caseName.trim()) {
      alert('กรุณากรอกอย่างน้อย ชื่อผู้ต้องหา หรือ ชื่อเคส หรือ เลขที่หมายจับ');
      return;
    }
    const linksArr = linksText
      .split(/\n|,/)
      .map(s => s.trim())
      .filter(Boolean);
    onSave({
      ...formData,
      age: formData.age === '' ? '' : Number(formData.age),
      relatedLinks: linksArr
    });

    const prevLabel = `${formData.prefix || ''}${formData.firstName || ''} ${formData.lastName || ''}`.trim() || formData.warrantNumber;
    const nextWarrantNo = incrementWarrantNumber(formData.warrantNumber);

    setFormData((prev) => ({
      ...EMPTY_WARRANT,
      caseName: prev.caseName,
      court: prev.court,
      issueDate: prev.issueDate,
      charge: prev.charge,
      owner: prev.owner,
      assignedTo: prev.assignedTo,
      linkedCaseId: prev.linkedCaseId,
      folderId: prev.folderId,
      warrantNumber: nextWarrantNo
    }));
    setSavedNextNotice(`✓ บันทึก "${prevLabel}" เรียบร้อย — กรอกผู้ต้องหารายถัดไปได้เลย (จำเคส/ศาล/ข้อหาเดิมไว้ให้แล้ว)`);
    setTimeout(() => setSavedNextNotice(''), 4500);
  };

  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-blue-900/60 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition';
  const labelClass = 'block text-[11px] font-semibold text-slate-300 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#0B142A] border border-blue-800/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#0F1C3A] to-[#0B142A] border-b border-blue-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <FileWarning className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {editingWarrant ? 'แก้ไขข้อมูลหมายจับ' : 'เพิ่มหมายจับใหม่'}
              </h3>
              <p className="text-[11px] text-slate-400">
                ขั้นตอนที่ {step}/2: {step === 1 ? 'ข้อมูลหมายจับ & คดีที่เชื่อมโยง' : 'ข้อมูลผู้ต้องหา & ที่อยู่'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stepper Indicator */}
        <div className="px-5 py-2.5 bg-[#070D1E]/70 border-b border-blue-900/40 flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold transition ${
              step === 1
                ? 'bg-amber-500 text-slate-950'
                : 'bg-blue-950/60 text-slate-300 hover:text-white'
            }`}
          >
            <span>1. ข้อมูลหมายจับ</span>
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold transition ${
              step === 2
                ? 'bg-amber-500 text-slate-950'
                : 'bg-blue-950/60 text-slate-300 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>2. ข้อมูลผู้ต้องหา</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {savedNextNotice && (
            <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs font-semibold">
              {savedNextNotice}
            </div>
          )}
          {step === 1 ? (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>ศาลที่ออกหมาย</label>
                  <input
                    type="text"
                    value={formData.court}
                    onChange={(e) => updateField('court', e.target.value)}
                    placeholder="เช่น ศาลอาญา (ใส่ภายหลังได้)"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>เลขที่หมายจับ</label>
                  <input
                    type="text"
                    value={formData.warrantNumber}
                    onChange={(e) => updateField('warrantNumber', e.target.value)}
                    placeholder="เช่น 1493/2569 (ใส่ภายหลังได้)"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>วันที่ออกหมาย</label>
                  <DateInput
                    value={formData.issueDate}
                    onChange={(e) => updateField('issueDate', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>เจ้าของหมาย</label>
                  <select
                    value={formData.owner}
                    onChange={(e) => updateField('owner', e.target.value)}
                    className={inputClass}
                  >
                    {WARRANT_OWNER_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>สถานะ</label>
                  <select
                    value={formData.status}
                    onChange={(e) => updateField('status', e.target.value)}
                    className={inputClass}
                  >
                    {WARRANT_STATUS_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>ผู้รับผิดชอบติดตามหมาย</label>
                  <select
                    value={formData.assignedTo}
                    onChange={(e) => updateField('assignedTo', e.target.value)}
                    className={inputClass}
                  >
                    <option value="">-- เลือกเจ้าหน้าที่ --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.badge})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>เชื่อมโยงกับงานใน To-Do (ไม่บังคับ)</label>
                  <select
                    value={formData.linkedCaseId || ''}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const linked = cases.find(c => c.id === nextId);
                      setFormData(prev => ({
                        ...prev,
                        linkedCaseId: nextId,
                        caseName: linked ? (prev.caseName || linked.title) : prev.caseName
                      }));
                    }}
                    className={inputClass}
                  >
                    <option value="">-- แยกอิสระ (ไม่เชื่อมคดี) --</option>
                    {cases.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.docNumber ? `[${c.docNumber}] ` : ''}{c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>ชื่อเคส (สำหรับจัดกลุ่มผู้ต้องหาและสรุปสถิติแยกเคส)</label>
                <CaseNameSelect
                  value={formData.caseName || ''}
                  onChange={(val) => updateField('caseName', val)}
                  operations={operations}
                  warrants={warrants}
                  cases={cases}
                  placeholder="คลิกเลือกเคสที่สร้างไว้ หรือพิมพ์ค้นหา/สร้างชื่อเคสใหม่..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>ข้อหา / ฐานความผิด</label>
                <textarea
                  rows={3}
                  value={formData.charge}
                  onChange={(e) => updateField('charge', e.target.value)}
                  placeholder="ระบุข้อหาตามหมายจับ (ใส่ภายหลังได้)..."
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <FileDropzone
                  label="ไฟล์หมายจับ / ลิงก์หมายจับ (PDF หรือ รูปภาพ)"
                  hint="ลากไฟล์หมายจับมาวาง หรือคลิกเลือกไฟล์ / Ctrl+V"
                  value={formData.warrantFileUrl}
                  onChange={(val) => updateField('warrantFileUrl', val)}
                />
                <div className="p-2.5 rounded-xl border border-blue-900/70 bg-[#070D1E]/90">
                  <label className={labelClass}>Folder ID (Google Drive ของผู้ต้องหารายนี้)</label>
                  <input
                    type="text"
                    value={formData.folderId}
                    onChange={(e) => updateField('folderId', e.target.value)}
                    placeholder="ระบบสร้างโฟลเดอร์ เคส > ผู้ต้องหา อัตโนมัติเมื่อบันทึก"
                    className={inputClass}
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
                    ระบบจะสร้างโฟลเดอร์แยกตาม <span className="text-amber-300">ชื่อเคส &gt; เลขหมายจับ_ชื่อผู้ต้องหา</span> ให้อัตโนมัติ และเปลี่ยนชื่อโฟลเดอร์ตามหากแก้ไขเลขหมายจับ
                  </p>
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-1">
                    <LinkIcon className="w-3 h-3 text-cyan-400" />
                    ลิงก์ที่เกี่ยวข้อง (1 ลิงก์ต่อ 1 บรรทัด)
                  </span>
                </label>
                <textarea
                  rows={2}
                  value={linksText}
                  onChange={(e) => setLinksText(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>เพศ</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => updateField('gender', e.target.value)}
                    className={inputClass}
                  >
                    <option value="ชาย">ชาย</option>
                    <option value="หญิง">หญิง</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>คำนำหน้า</label>
                  <input
                    type="text"
                    value={formData.prefix}
                    onChange={(e) => updateField('prefix', e.target.value)}
                    placeholder="นาย / นางสาว"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>ชื่อ *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    placeholder="ชื่อจริง"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>นามสกุล</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    placeholder="นามสกุล (ใส่ภายหลังได้)"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>เลขประจำตัวประชาชน</label>
                  <input
                    type="text"
                    maxLength={13}
                    value={formData.nationalId}
                    onChange={(e) => updateField('nationalId', e.target.value)}
                    placeholder="13 หลัก"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>วัน/เดือน/ปีเกิด</label>
                  <DateInput
                    value={formData.dob}
                    onChange={(e) => updateField('dob', e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>อายุ (ปี)</label>
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={formData.age}
                    onChange={(e) => updateField('age', e.target.value)}
                    placeholder="คำนวณอัตโนมัติ"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>ตำแหน่ง / หน้าที่ (บทบาทในคดี)</label>
                  <input
                    type="text"
                    value={formData.role || ''}
                    onChange={(e) => updateField('role', e.target.value)}
                    placeholder="เช่น ผู้สั่งการ, บัญชีม้าแถว 1, ผู้กดเงิน, แอดมินเพจ"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>หมายเหตุ</label>
                  <input
                    type="text"
                    value={formData.notes || ''}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="ระบุรายละเอียดเพิ่มเติม / พฤติการณ์..."
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#070D1E]/70 border border-blue-900/50 space-y-3">
                <div className="text-[11px] font-bold text-amber-400">ที่อยู่ตามทะเบียนราษฎร์</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>บ้านเลขที่</label>
                    <input
                      type="text"
                      value={formData.houseNo}
                      onChange={(e) => updateField('houseNo', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>หมู่</label>
                    <input
                      type="text"
                      value={formData.moo}
                      onChange={(e) => updateField('moo', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelClass}>ถนน</label>
                    <input
                      type="text"
                      value={formData.road}
                      onChange={(e) => updateField('road', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>ตำบล / แขวง</label>
                    <input
                      type="text"
                      value={formData.subdistrict}
                      onChange={(e) => updateField('subdistrict', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>อำเภอ / เขต</label>
                    <input
                      type="text"
                      value={formData.district}
                      onChange={(e) => updateField('district', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>จังหวัด</label>
                    <input
                      type="text"
                      list="thai-provinces-warrant"
                      value={formData.province}
                      onChange={(e) => updateField('province', e.target.value)}
                      className={inputClass}
                    />
                    <datalist id="thai-provinces-warrant">
                      {THAI_PROVINCES.map(p => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    field: 'personPhotoUrl',
                    label: 'รูปภาพผู้ต้องหา / ลิงก์',
                    hint: 'ลากรูปวาง หรือ Ctrl+V วางรูปผู้ต้องหา'
                  },
                  {
                    field: 'houseRegUrl',
                    label: 'ทะเบียนราษฎร์ (ทร.14) / ลิงก์',
                    hint: 'ลากรูปวาง หรือ Ctrl+V วางภาพ ทร.14'
                  },
                  {
                    field: 'naraiRegUrl',
                    label: 'ฐานข้อมูล Narai / ลิงก์',
                    hint: 'ลากรูปวาง หรือ Ctrl+V วางภาพ Narai'
                  }
                ].map(({ field, label, hint }) => {
                  const val = formData[field] || '';
                  const isImagePreview =
                    val.startsWith('data:image/') ||
                    /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(val) ||
                    val.includes('drive.google.com/uc') ||
                    val.includes('lh3.googleusercontent.com');
                  const isDragging = dragActiveField === field;
                  const isJustPasted = pasteNoticeField === field;

                  return (
                    <div
                      key={field}
                      tabIndex={0}
                      onPaste={(e) => handlePasteEventForField(e, field)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragActiveField(field);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (dragActiveField === field) setDragActiveField(null);
                      }}
                      onDrop={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragActiveField(null);
                        const file = e.dataTransfer?.files?.[0];
                        if (file && file.type.startsWith('image/')) {
                          await handleImageFileForField(field, file);
                          return;
                        }
                        const textData = e.dataTransfer?.getData('text/plain');
                        if (textData && textData.trim()) {
                          updateField(field, textData.trim());
                          showPasteSuccess(field);
                        }
                      }}
                      className={`p-2.5 rounded-xl border transition focus:outline-none ${
                        isDragging
                          ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/40'
                          : 'border-blue-900/70 bg-[#070D1E]/90 focus:border-amber-400'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <label className="text-[11px] font-bold text-slate-200 truncate">
                          {label}
                        </label>
                        {val && (
                          <button
                            type="button"
                            onClick={() => updateField(field, '')}
                            className="p-1 rounded text-red-400 hover:bg-red-950/60 transition"
                            title="ลบรูป/ลิงก์"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Dropzone / Preview Box */}
                      {val ? (
                        <div className="mb-2 relative group rounded-lg overflow-hidden border border-blue-800/60 bg-slate-950 h-28 flex items-center justify-center">
                          {isImagePreview ? (
                            <img
                              src={normalizeImageUrl(val)}
                              alt={label}
                              onError={(e) => {
                                const m = String(val || '').match(/([a-zA-Z0-9_-]{25,})/);
                                if (m && !e.target.src.includes('thumbnail')) {
                                  e.target.src = `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200`;
                                }
                              }}
                              className="max-h-full max-w-full object-contain"
                            />
                          ) : (
                            <a
                              href={val}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-center text-[11px] text-cyan-400 underline break-all line-clamp-3"
                            >
                              {val}
                            </a>
                          )}
                          {isJustPasted && (
                            <div className="absolute inset-x-0 bottom-0 bg-emerald-600/90 text-white text-[10px] font-bold py-0.5 text-center">
                              ✓ วางข้อมูลสำเร็จ
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-2 rounded-lg border border-dashed border-blue-800/80 hover:border-amber-400/70 bg-[#0A1329]/70 h-24 flex flex-col items-center justify-center p-2 text-center transition">
                          <ImageIcon className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-[10px] text-slate-300 leading-tight">
                            {hint}
                          </span>
                          <span className="text-[9px] text-amber-300/80 mt-0.5">
                            (คลิกกรอบนี้แล้วกด Ctrl+V ได้เลย)
                          </span>
                        </div>
                      )}

                      {/* Action Buttons: Upload File & Paste Clipboard */}
                      <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                        <label className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-blue-950/80 hover:bg-blue-900 text-blue-200 border border-blue-800/60 text-[10px] font-semibold cursor-pointer transition">
                          <Upload className="w-3 h-3" />
                          <span>เลือกรูป</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                await handleImageFileForField(field, file);
                              }
                              e.target.value = '';
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => handleClipboardButtonForField(field)}
                          className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[10px] font-semibold cursor-pointer transition"
                          title="วางรูปภาพหรือลิงก์จาก Clipboard"
                        >
                          <ClipboardPaste className="w-3 h-3" />
                          <span>วาง Clipboard</span>
                        </button>
                      </div>

                      {/* Direct URL Input */}
                      <input
                        type="text"
                        value={val.startsWith('data:image/') ? '' : val}
                        onChange={(e) => updateField(field, e.target.value)}
                        onPaste={(e) => handlePasteEventForField(e, field)}
                        placeholder={
                          val.startsWith('data:image/')
                            ? '✓ แนบไฟล์รูปภาพแล้ว (หรือวางลิงก์แทน)'
                            : 'หรือวางลิงก์ https://... ที่นี่'
                        }
                        className="w-full px-2 py-1 rounded bg-[#050A18] border border-blue-900/50 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-blue-900/50 flex items-center justify-between gap-2">
            <div>
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับ</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                ยกเลิก
              </button>
              {step === 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                  >
                    <span>ถัดไป (ข้อมูลผู้ต้องหา)</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  {editingWarrant && (
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-60"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSaving ? 'กำลังอัปโหลด & บันทึก...' : 'บันทึกหมายจับ'}</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {!editingWarrant && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={handleSaveAndNext}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-60"
                      title="บันทึกรายนี้แล้วค้างข้อมูลเคส/ศาล/ข้อหาเดิมไว้สำหรับกรอกรายถัดไปทันที"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>บันทึก & เพิ่มรายถัดไป</span>
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md transition cursor-pointer disabled:opacity-60"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSaving ? 'กำลังอัปโหลด & บันทึก...' : 'บันทึกหมายจับ'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
