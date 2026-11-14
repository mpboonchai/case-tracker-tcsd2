import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Save, Users, Check, Camera, Upload, Trash2 } from 'lucide-react';
import { THAI_PROVINCES } from '../data/initialData';

const PHOTO_SLOTS = [
  { key: 'photoArrest', label: '1. รูปขณะจับกุม' },
  { key: 'photoFront', label: '2. ด้านหน้า (หน้าตรง)' },
  { key: 'photoLeft', label: '3. ด้านซ้าย' },
  { key: 'photoRight', label: '4. ด้านขวา' },
  { key: 'photoBack', label: '5. ด้านหลัง' },
];

const REPORT_PHOTO_SLOTS = [
  { key: 'photoReport1', label: 'ภาพรายงาน 1 (PPT)' },
  { key: 'photoReport2', label: 'ภาพรายงาน 2 (PPT)' },
  { key: 'photoReport3', label: 'ภาพรายงาน 3 (PPT)' },
];

function compressImageFile(file, maxSize = 900, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('อ่านไฟล์รูปภาพไม่สำเร็จ'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('ไฟล์ไม่ใช่รูปภาพที่รองรับ'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width >= height) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          } else {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ArrestRecordModal({
  isOpen,
  onClose,
  onSave,
  warrant = null,
  personnel = []
}) {
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [formData, setFormData] = useState({
    arrestDate: '',
    arrestTime: '',
    arrestLocation: '',
    arrestSubdistrict: '',
    arrestDistrict: '',
    arrestProvince: 'กรุงเทพมหานคร',
    recordDate: '',
    recordTime: '',
    recordLocation: 'กก.2 บก.ปอท.',
    recordSubdistrict: 'จอมพล',
    recordDistrict: 'จตุจักร',
    recordProvince: 'กรุงเทพมหานคร',
    forceMajeure: 'เนื่องจากสถานที่จับกุมไม่สะดวกในการจัดทำบันทึก จึงนำตัวมาทำบันทึกยัง กก.2 บก.ปอท.',
    relativePrefix: '',
    relativeFirstName: '',
    relativeLastName: '',
    relativePhone: '',
    relativeRelation: '',
    handoverOfficer: '',
    handoverLocation: '',
    handoverAddress: '',
    notifierId: '',
    recorderId: '',
    arrestingOfficers: [],
    newsLink: '',
    photoArrest: '',
    photoFront: '',
    photoLeft: '',
    photoRight: '',
    photoBack: '',
    photoReport1: '',
    photoReport2: '',
    photoReport3: ''
  });

  useEffect(() => {
    if (!isOpen || !warrant) return;
    const today = new Date().toISOString().slice(0, 10);
    setFormData({
      arrestDate: warrant.arrestDate || today,
      arrestTime: warrant.arrestTime || '09:00',
      arrestLocation: warrant.arrestLocation || '',
      arrestSubdistrict: warrant.arrestSubdistrict || '',
      arrestDistrict: warrant.arrestDistrict || '',
      arrestProvince: warrant.arrestProvince || warrant.province || 'กรุงเทพมหานคร',
      recordDate: warrant.recordDate || today,
      recordTime: warrant.recordTime || '10:30',
      recordLocation: warrant.recordLocation || 'กก.2 บก.ปอท.',
      recordSubdistrict: warrant.recordSubdistrict || 'จอมพล',
      recordDistrict: warrant.recordDistrict || 'จตุจักร',
      recordProvince: warrant.recordProvince || 'กรุงเทพมหานคร',
      forceMajeure:
        warrant.forceMajeure ||
        'เนื่องจากสถานที่จับกุมไม่สะดวกในการจัดทำบันทึก จึงนำตัวมาทำบันทึกยัง กก.2 บก.ปอท.',
      relativePrefix: warrant.relativePrefix || '',
      relativeFirstName: warrant.relativeFirstName || '',
      relativeLastName: warrant.relativeLastName || '',
      relativePhone: warrant.relativePhone || '',
      relativeRelation: warrant.relativeRelation || '',
      handoverOfficer: warrant.handoverOfficer || '',
      handoverLocation: warrant.handoverLocation || '',
      handoverAddress: warrant.handoverAddress || '',
      notifierId: warrant.notifierId || '',
      recorderId: warrant.recorderId || '',
      arrestingOfficers: Array.isArray(warrant.arrestingOfficers)
        ? warrant.arrestingOfficers
        : [],
      newsLink: warrant.newsLink || '',
      photoArrest: warrant.photoArrest || '',
      photoFront: warrant.photoFront || '',
      photoLeft: warrant.photoLeft || '',
      photoRight: warrant.photoRight || '',
      photoBack: warrant.photoBack || '',
      photoReport1: warrant.photoReport1 || '',
      photoReport2: warrant.photoReport2 || '',
      photoReport3: warrant.photoReport3 || ''
    });
  }, [isOpen, warrant]);

  if (!isOpen || !warrant) return null;

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrestingOfficer = (personId) => {
    setFormData(prev => {
      const exists = prev.arrestingOfficers.includes(personId);
      if (exists) {
        return {
          ...prev,
          arrestingOfficers: prev.arrestingOfficers.filter(id => id !== personId)
        };
      }
      if (prev.arrestingOfficers.length >= 10) return prev;
      return {
        ...prev,
        arrestingOfficers: [...prev.arrestingOfficers, personId]
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...warrant,
      ...formData,
      status: 'จับกุมแล้ว'
    });
    onClose();
  };

  const inputClass =
    'w-full px-3 py-1.5 rounded-lg bg-[#070D1E] border border-blue-900/60 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition';
  const labelClass = 'block text-[11px] font-semibold text-slate-300 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl bg-[#0B142A] border border-emerald-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-950/60 via-[#0F1C3A] to-[#0B142A] border-b border-blue-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                บันทึกผลการจับกุมตัวตามหมายจับ
              </h3>
              <p className="text-[11px] text-emerald-300/90">
                {warrant.prefix}{warrant.firstName} {warrant.lastName} • หมายจับ {warrant.court} ที่ {warrant.warrantNumber}
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Arrest Location & Time */}
          <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-blue-900/50 space-y-3">
            <div className="text-xs font-bold text-amber-400">1. วัน เวลา และสถานที่จับกุม</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelClass}>วันที่จับกุม *</label>
                <input
                  type="date"
                  required
                  value={formData.arrestDate}
                  onChange={(e) => updateField('arrestDate', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>เวลาจับกุม *</label>
                <input
                  type="text"
                  required
                  value={formData.arrestTime}
                  onChange={(e) => updateField('arrestTime', e.target.value)}
                  placeholder="เช่น 07:30"
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>สถานที่จับกุม *</label>
                <input
                  type="text"
                  required
                  value={formData.arrestLocation}
                  onChange={(e) => updateField('arrestLocation', e.target.value)}
                  placeholder="เช่น บริเวณหน้าบ้านเลขที่ 99/12..."
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>ตำบล/แขวง (จับกุม)</label>
                <input
                  type="text"
                  value={formData.arrestSubdistrict}
                  onChange={(e) => updateField('arrestSubdistrict', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>อำเภอ/เขต (จับกุม)</label>
                <input
                  type="text"
                  value={formData.arrestDistrict}
                  onChange={(e) => updateField('arrestDistrict', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>จังหวัด (จับกุม)</label>
                <input
                  type="text"
                  list="thai-provinces-arrest"
                  value={formData.arrestProvince}
                  onChange={(e) => updateField('arrestProvince', e.target.value)}
                  className={inputClass}
                />
                <datalist id="thai-provinces-arrest">
                  {THAI_PROVINCES.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
            </div>
          </div>

          {/* Record Location & Force Majeure */}
          <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-blue-900/50 space-y-3">
            <div className="text-xs font-bold text-cyan-400">2. สถานที่จัดทำบันทึกจับกุม & เหตุสุดวิสัย</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelClass}>วันที่ทำบันทึก</label>
                <input
                  type="date"
                  value={formData.recordDate}
                  onChange={(e) => updateField('recordDate', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>เวลาทำบันทึก</label>
                <input
                  type="text"
                  value={formData.recordTime}
                  onChange={(e) => updateField('recordTime', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>สถานที่ทำบันทึก</label>
                <input
                  type="text"
                  value={formData.recordLocation}
                  onChange={(e) => updateField('recordLocation', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>แขวง/ตำบล (บันทึก)</label>
                <input
                  type="text"
                  value={formData.recordSubdistrict}
                  onChange={(e) => updateField('recordSubdistrict', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>เขต/อำเภอ (บันทึก)</label>
                <input
                  type="text"
                  value={formData.recordDistrict}
                  onChange={(e) => updateField('recordDistrict', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>จังหวัด (บันทึก)</label>
                <input
                  type="text"
                  list="thai-provinces-arrest"
                  value={formData.recordProvince}
                  onChange={(e) => updateField('recordProvince', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>เหตุสุดวิสัย (ม.22 / ม.23)</label>
              <input
                type="text"
                value={formData.forceMajeure}
                onChange={(e) => updateField('forceMajeure', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Relative & Handover */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-blue-900/50 space-y-2.5">
              <div className="text-xs font-bold text-slate-200">3. ญาติ/ผู้ไว้วางใจที่แจ้งการจับกุม</div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="คำนำหน้า"
                  value={formData.relativePrefix}
                  onChange={(e) => updateField('relativePrefix', e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="ชื่อ"
                  value={formData.relativeFirstName}
                  onChange={(e) => updateField('relativeFirstName', e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="นามสกุล"
                  value={formData.relativeLastName}
                  onChange={(e) => updateField('relativeLastName', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="ความสัมพันธ์ (เช่น มารดา)"
                  value={formData.relativeRelation}
                  onChange={(e) => updateField('relativeRelation', e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="เบอร์โทร"
                  value={formData.relativePhone}
                  onChange={(e) => updateField('relativePhone', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-blue-900/50 space-y-2.5">
              <div className="text-xs font-bold text-slate-200">4. การส่งมอบตัวผู้ต้องหา & ข่าว</div>
              <input
                type="text"
                placeholder="พนักงานสอบสวนผู้รับมอบตัว"
                value={formData.handoverOfficer}
                onChange={(e) => updateField('handoverOfficer', e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="สถานที่ส่งตัว (เช่น สน.พหลโยธิน)"
                value={formData.handoverLocation}
                onChange={(e) => updateField('handoverLocation', e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="ที่ตั้ง สน./สภ. ที่ส่งตัว"
                value={formData.handoverAddress}
                onChange={(e) => updateField('handoverAddress', e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                placeholder="ลิงก์ข่าว (ถ้ามี)"
                value={formData.newsLink}
                onChange={(e) => updateField('newsLink', e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Arresting Officers & Signers */}
          <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-blue-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                5. ชุดจับกุม (เลือกได้สูงสุด 10 นาย — เลือกแล้ว {formData.arrestingOfficers.length}/10)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {personnel.map(p => {
                const selected = formData.arrestingOfficers.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleArrestingOfficer(p.id)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs transition ${
                      selected
                        ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200'
                        : 'bg-[#0B142A] border-blue-900/50 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                        selected
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                          : 'border-slate-600'
                      }`}
                    >
                      {selected && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <span className="truncate">
                      {p.rank} {p.firstName} {p.lastName}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className={labelClass}>ผู้แจ้งการควบคุมตัว (ม.22)</label>
                <select
                  value={formData.notifierId}
                  onChange={(e) => updateField('notifierId', e.target.value)}
                  className={inputClass}
                >
                  <option value="">-- เลือกเจ้าหน้าที่ --</option>
                  {personnel.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.rank} {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>ผู้บันทึกการจับกุม</label>
                <select
                  value={formData.recorderId}
                  onChange={(e) => updateField('recorderId', e.target.value)}
                  className={inputClass}
                >
                  <option value="">-- เลือกเจ้าหน้าที่ --</option>
                  {personnel.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.rank} {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 6. Arrest & 4-Sided Suspect Photos */}
          <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                6. ภาพถ่ายประกอบบันทึก (รูปขณะจับกุม & รูปผู้ต้องหา 4 ด้าน สำหรับใส่ใน บันทึกจับกุม / ม.22 / ม.23)
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {PHOTO_SLOTS.map(slot => {
                const value = formData[slot.key];
                const isDragging = dragOverSlot === slot.key;
                const handleFile = async (file) => {
                  if (!file) return;
                  if (!file.type.startsWith('image/')) {
                    alert('กรุณาเลือกหรือลากไฟล์รูปภาพเท่านั้น');
                    return;
                  }
                  try {
                    const compressed = await compressImageFile(file);
                    updateField(slot.key, compressed);
                  } catch (err) {
                    alert(err.message);
                  }
                };

                return (
                  <div
                    key={slot.key}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragOverSlot !== slot.key) setDragOverSlot(slot.key);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragOverSlot === slot.key) setDragOverSlot(null);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverSlot(null);
                      const file = e.dataTransfer?.files?.[0];
                      await handleFile(file);
                    }}
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1.5 transition ${
                      isDragging
                        ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/50'
                        : 'bg-[#0B142A] border-blue-900/50'
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-slate-300 text-center">
                      {slot.label}
                    </span>
                    {value ? (
                      <div className="relative w-full aspect-[3/4] rounded overflow-hidden border border-emerald-500/40 bg-black/40">
                        <img
                          src={value}
                          alt={slot.label}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => updateField(slot.key, '')}
                          title="ลบรูป"
                          className="absolute top-1 right-1 p-1 rounded bg-red-600/90 hover:bg-red-500 text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-full aspect-[3/4] rounded border border-dashed border-blue-700/70 hover:border-amber-400/70 bg-[#070D1E]/60 flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-400 hover:text-amber-300 transition text-center px-1">
                        <Upload className="w-4 h-4" />
                        <span className="text-[10px] leading-tight">
                          {isDragging ? 'วางรูปที่นี่' : 'คลิก หรือ ลากรูปมาวาง'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            await handleFile(e.target.files?.[0]);
                          }}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7. 3 Report Photos for PowerPoint */}
          <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-cyan-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                7. ภาพประกอบการรายงาน 3 รูป (สำหรับใส่ในไฟล์ PowerPoint รายงานการจับกุม .pptx)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {REPORT_PHOTO_SLOTS.map(slot => {
                const value = formData[slot.key];
                const isDragging = dragOverSlot === slot.key;
                const handleFile = async (file) => {
                  if (!file) return;
                  if (!file.type.startsWith('image/')) {
                    alert('กรุณาเลือกหรือลากไฟล์รูปภาพเท่านั้น');
                    return;
                  }
                  try {
                    const compressed = await compressImageFile(file);
                    updateField(slot.key, compressed);
                  } catch (err) {
                    alert(err.message);
                  }
                };

                return (
                  <div
                    key={slot.key}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragOverSlot !== slot.key) setDragOverSlot(slot.key);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragOverSlot === slot.key) setDragOverSlot(null);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverSlot(null);
                      await handleFile(e.dataTransfer?.files?.[0]);
                    }}
                    className={`p-2 rounded-lg border flex flex-col items-center gap-1.5 transition ${
                      isDragging
                        ? 'bg-cyan-500/15 border-cyan-400 ring-2 ring-cyan-400/50'
                        : 'bg-[#0B142A] border-blue-900/50'
                    }`}
                  >
                    <span className="text-[10px] font-semibold text-slate-300 text-center">
                      {slot.label}
                    </span>
                    {value ? (
                      <div className="relative w-full aspect-[16/10] rounded overflow-hidden border border-emerald-500/40 bg-black/40">
                        <img
                          src={value}
                          alt={slot.label}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => updateField(slot.key, '')}
                          title="ลบรูป"
                          className="absolute top-1 right-1 p-1 rounded bg-red-600/90 hover:bg-red-500 text-white"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="w-full aspect-[16/10] rounded border border-dashed border-cyan-700/70 hover:border-cyan-400/70 bg-[#070D1E]/60 flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-400 hover:text-cyan-300 transition text-center px-1">
                        <Upload className="w-4 h-4" />
                        <span className="text-[10px] leading-tight">
                          {isDragging ? 'วางรูปที่นี่' : 'คลิก หรือ ลากรูปมาวาง'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            await handleFile(e.target.files?.[0]);
                          }}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-2 border-t border-blue-900/50 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-bold shadow-md transition"
            >
              <Save className="w-3.5 h-3.5" />
              <span>บันทึกผลการจับกุม</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
