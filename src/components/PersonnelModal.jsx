import React, { useState, useEffect } from 'react';
import { X, Save, UserCheck, Phone, Shield, Calendar } from 'lucide-react';
import {
  RANK_OPTIONS,
  POSITION_OPTIONS,
  DIVISION_OPTIONS,
  PERSONNEL_STATUS_OPTIONS
} from '../data/initialData';
import DateInput from './DateInput';

export default function PersonnelModal({ isOpen, onClose, person, onSave }) {
  const [form, setForm] = useState({
    prefix: '',
    firstName: '',
    lastName: '',
    gender: 'ชาย',
    position: '',
    positionDetail: '',
    unit: 'กก.2 บก.ปอท.',
    division: '',
    phone: '',
    dob: '',
    status: 'ปฏิบัติหน้าที่',
    badge: '',
    rankEn: '',
    firstNameEn: '',
    lastNameEn: '',
    nationalId: '',
    shirtSize: '',
    bloodType: '',
    bank: '',
    bankAccount: '',
    photoUrl: '',
    qrCodeUrl: '',
  });
  const [showExtended, setShowExtended] = useState(false);

  useEffect(() => {
    if (person) {
      setForm({
        prefix: person.prefix || '',
        firstName: person.firstName || '',
        lastName: person.lastName || '',
        gender: person.gender || 'ชาย',
        position: person.position || '',
        positionDetail: person.positionDetail || '',
        unit: person.unit || 'กก.2 บก.ปอท.',
        division: person.division || '',
        phone: person.phone || '',
        dob: person.dob || '',
        status: person.status || 'ปฏิบัติหน้าที่',
        badge: person.badge || '',
        rankEn: person.rankEn || '',
        firstNameEn: person.firstNameEn || '',
        lastNameEn: person.lastNameEn || '',
        nationalId: person.nationalId || '',
        shirtSize: person.shirtSize || '',
        bloodType: person.bloodType || '',
        bank: person.bank || '',
        bankAccount: person.bankAccount || '',
        photoUrl: person.photoUrl || '',
        qrCodeUrl: person.qrCodeUrl || '',
      });
    } else {
      setForm({
        prefix: '',
        firstName: '',
        lastName: '',
        gender: 'ชาย',
        position: '',
        positionDetail: '',
        unit: 'กก.2 บก.ปอท.',
        division: '',
        phone: '',
        dob: '',
        status: 'ปฏิบัติหน้าที่',
        badge: '',
        rankEn: '',
        firstNameEn: '',
        lastNameEn: '',
        nationalId: '',
        shirtSize: '',
        bloodType: '',
        bank: '',
        bankAccount: '',
        photoUrl: '',
        qrCodeUrl: '',
      });
    }
    setShowExtended(false);
  }, [person, isOpen]);

  if (!isOpen) return null;

  const setField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setField('photoUrl', ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.prefix || !form.firstName.trim() || !form.lastName.trim() || !form.position || !form.division) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ยศ, ชื่อ, นามสกุล, ตำแหน่ง, สายงาน)');
      return;
    }

    onSave({
      ...(person || {}),
      ...form,
      id: person?.id || `per-${Date.now()}`,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      positionDetail: form.positionDetail.trim() || `${form.position} ${form.unit}`.trim(),
      avatar: person?.avatar || (form.gender === 'หญิง' ? '👩‍💻' : '👮‍♂️'),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl my-6 bg-[#0B142B] border border-blue-900/80 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[#080E1E] border-b border-[#1E2E54] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-white">
                {person ? 'แก้ไขข้อมูลกำลังพล' : 'เพิ่มข้อมูลกำลังพล'}
              </h2>
              <p className="text-[10px] text-slate-400">ฐานข้อมูลกำลังพล บก.ปอท. (รองรับโครงสร้าง Google Sheet)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form id="personnelForm" onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                ยศ <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={form.prefix}
                onChange={(e) => setField('prefix', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">-- เลือกยศ --</option>
                {RANK_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                ชื่อ <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setField('firstName', e.target.value)}
                className="w-full px-3 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                นามสกุล <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setField('lastName', e.target.value)}
                className="w-full px-3 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                ตำแหน่ง <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={form.position}
                onChange={(e) => setField('position', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">-- เลือกตำแหน่ง --</option>
                {POSITION_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                สายงาน <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={form.division}
                onChange={(e) => setField('division', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-white focus:outline-none focus:border-amber-400"
              >
                <option value="">-- เลือกสายงาน --</option>
                {DIVISION_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                เบอร์โทรศัพท์ <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                placeholder="08x-xxx-xxxx"
                className="w-full px-3 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                วัน/เดือน/ปี เกิด <span className="text-red-400">*</span>
              </label>
              <DateInput
                required
                value={form.dob}
                onChange={(e) => setField('dob', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">เพศ</label>
              <select
                value={form.gender}
                onChange={(e) => setField('gender', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-white focus:outline-none focus:border-amber-400"
              >
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">สถานะ</label>
              <select
                value={form.status}
                onChange={(e) => setField('status', e.target.value)}
                className="w-full px-2.5 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-white focus:outline-none focus:border-amber-400"
              >
                {PERSONNEL_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">ตำแหน่งเต็ม (สำหรับออกเอกสาร)</label>
              <input
                type="text"
                value={form.positionDetail}
                onChange={(e) => setField('positionDetail', e.target.value)}
                placeholder="เช่น รอง สว.กก.2 บก.ปอท."
                className="w-full px-3 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">รูปถ่าย (อัปโหลด หรือวาง URL)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.photoUrl}
                  onChange={(e) => setField('photoUrl', e.target.value)}
                  placeholder="URL รูปภาพ"
                  className="flex-1 px-2.5 py-1.5 bg-[#070D1E] rounded-lg border border-blue-900/60 text-white focus:outline-none focus:border-amber-400"
                />
                <label className="px-2.5 py-1.5 bg-blue-900/60 hover:bg-blue-800/80 text-blue-200 rounded-lg border border-blue-700/50 cursor-pointer whitespace-nowrap">
                  อัปโหลด
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          {/* Toggle Extended Sheet Fields */}
          <button
            type="button"
            onClick={() => setShowExtended((v) => !v)}
            className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
          >
            {showExtended ? '▲ ซ่อนข้อมูลเพิ่มเติม (ตาม Google Sheet)' : '▼ ข้อมูลเพิ่มเติม (ชื่อ EN, เลขบัตร, ไซส์เสื้อ, หมู่โลหิต, บัญชี)'}
          </button>

          {showExtended && (
            <div className="p-3 rounded-lg bg-[#070D1E] border border-blue-900/50 space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={form.rankEn}
                  onChange={(e) => setField('rankEn', e.target.value)}
                  placeholder="ยศภาษาอังกฤษ (Pol.Capt.)"
                  className="px-2.5 py-1.5 bg-[#0A1224] rounded border border-slate-700 text-white"
                />
                <input
                  type="text"
                  value={form.firstNameEn}
                  onChange={(e) => setField('firstNameEn', e.target.value)}
                  placeholder="ชื่อภาษาอังกฤษ"
                  className="px-2.5 py-1.5 bg-[#0A1224] rounded border border-slate-700 text-white"
                />
                <input
                  type="text"
                  value={form.lastNameEn}
                  onChange={(e) => setField('lastNameEn', e.target.value)}
                  placeholder="นามสกุลภาษาอังกฤษ"
                  className="px-2.5 py-1.5 bg-[#0A1224] rounded border border-slate-700 text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="tel"
                  maxLength={13}
                  value={form.nationalId}
                  onChange={(e) => setField('nationalId', e.target.value)}
                  placeholder="เลขประจำตัวประชาชน (13 หลัก)"
                  className="px-2.5 py-1.5 bg-[#0A1224] rounded border border-slate-700 text-white font-mono"
                />
                <input
                  type="text"
                  value={form.shirtSize}
                  onChange={(e) => setField('shirtSize', e.target.value)}
                  placeholder="ไซส์เสื้อ (S/M/L/XL)"
                  className="px-2.5 py-1.5 bg-[#0A1224] rounded border border-slate-700 text-white"
                />
                <input
                  type="text"
                  value={form.bloodType}
                  onChange={(e) => setField('bloodType', e.target.value)}
                  placeholder="หมู่โลหิต (A/B/AB/O)"
                  className="px-2.5 py-1.5 bg-[#0A1224] rounded border border-slate-700 text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={form.bank}
                  onChange={(e) => setField('bank', e.target.value)}
                  placeholder="ธนาคาร"
                  className="px-2.5 py-1.5 bg-[#0A1224] rounded border border-slate-700 text-white"
                />
                <input
                  type="text"
                  value={form.bankAccount}
                  onChange={(e) => setField('bankAccount', e.target.value)}
                  placeholder="เลขบัญชี"
                  className="px-2.5 py-1.5 bg-[#0A1224] rounded border border-slate-700 text-white font-mono"
                />
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#080E1E] border-t border-[#1E2E54] flex items-center justify-between">
          <button type="button" onClick={onClose} className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition">
            ยกเลิก
          </button>
          <button
            type="submit"
            form="personnelForm"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{person ? 'อัปเดตข้อมูล' : 'บันทึกข้อมูล'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
