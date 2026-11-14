import React, { useState, useEffect } from 'react';
import { X, FileWarning, UserCheck, ChevronRight, ChevronLeft, Save, Link as LinkIcon } from 'lucide-react';
import {
  WARRANT_OWNER_OPTIONS,
  WARRANT_STATUS_OPTIONS,
  THAI_PROVINCES
} from '../data/initialData';
import { calculateAge } from '../services/storage';

const EMPTY_WARRANT = {
  folderId: '',
  linkedCaseId: '',
  caseName: '',
  court: 'ศาลอาญา',
  warrantNumber: '',
  issueDate: new Date().toISOString().slice(0, 10),
  charge: '',
  owner: 'หมายจับภายใน',
  gender: 'ชาย',
  prefix: 'นาย',
  firstName: '',
  lastName: '',
  dob: '',
  age: '',
  nationalId: '',
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
  users = []
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(EMPTY_WARRANT);
  const [linksText, setLinksText] = useState('');

  useEffect(() => {
    if (!isOpen) return;
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
  }, [isOpen, editingWarrant, users]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.warrantNumber.trim() || !formData.firstName.trim()) return;
    const linksArr = linksText
      .split(/\n|,/)
      .map(s => s.trim())
      .filter(Boolean);
    onSave({
      ...formData,
      age: formData.age === '' ? '' : Number(formData.age),
      relatedLinks: linksArr
    });
    onClose();
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
          {step === 1 ? (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>ศาลที่ออกหมาย *</label>
                  <input
                    type="text"
                    required
                    value={formData.court}
                    onChange={(e) => updateField('court', e.target.value)}
                    placeholder="เช่น ศาลอาญา"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>เลขที่หมายจับ *</label>
                  <input
                    type="text"
                    required
                    value={formData.warrantNumber}
                    onChange={(e) => updateField('warrantNumber', e.target.value)}
                    placeholder="เช่น 1493/2569"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>วันที่ออกหมาย</label>
                  <input
                    type="date"
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
                <input
                  type="text"
                  list="warrant-case-names"
                  value={formData.caseName || ''}
                  onChange={(e) => updateField('caseName', e.target.value)}
                  placeholder="เช่น คดีหลอกลงทุนคริปโตฯ / เครือข่ายเว็บพนันออนไลน์..."
                  className={inputClass}
                />
                <datalist id="warrant-case-names">
                  {cases.map(c => (
                    <option key={c.id} value={c.title} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className={labelClass}>ข้อหา / ฐานความผิด *</label>
                <textarea
                  rows={3}
                  required
                  value={formData.charge}
                  onChange={(e) => updateField('charge', e.target.value)}
                  placeholder="ระบุข้อหาตามหมายจับ..."
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>ลิงก์ไฟล์หมายจับ (Google Drive / URL)</label>
                  <input
                    type="text"
                    value={formData.warrantFileUrl}
                    onChange={(e) => updateField('warrantFileUrl', e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Folder ID (Google Drive)</label>
                  <input
                    type="text"
                    value={formData.folderId}
                    onChange={(e) => updateField('folderId', e.target.value)}
                    placeholder="เช่น 1AbCdEfG..."
                    className={inputClass}
                  />
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
                  <label className={labelClass}>นามสกุล *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    placeholder="นามสกุล"
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
                  <input
                    type="date"
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
                <div>
                  <label className={labelClass}>ลิงก์รูปภาพผู้ต้องหา</label>
                  <input
                    type="text"
                    value={formData.personPhotoUrl}
                    onChange={(e) => updateField('personPhotoUrl', e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>ลิงก์ทะเบียนราษฎร์ (ทร.14)</label>
                  <input
                    type="text"
                    value={formData.houseRegUrl}
                    onChange={(e) => updateField('houseRegUrl', e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>ลิงก์ฐานข้อมูล Narai</label>
                  <input
                    type="text"
                    value={formData.naraiRegUrl}
                    onChange={(e) => updateField('naraiRegUrl', e.target.value)}
                    placeholder="https://..."
                    className={inputClass}
                  />
                </div>
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
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                >
                  <span>ถัดไป (ข้อมูลผู้ต้องหา)</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-md transition"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกหมายจับ</span>
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
