import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  ShieldAlert,
  Save,
  Users,
  Check,
  Camera,
  Upload,
  Trash2,
  UserPlus,
  Copy,
  Search
} from 'lucide-react';
import { THAI_PROVINCES } from '../data/initialData';
import { normalizeImageUrl, formatTimeHHMM } from '../services/storage';
import DateInput, { getTodayDMY, toDMY } from './DateInput';
import FileDropzone from './FileDropzone';

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

function compressImageFile(file, maxSize = 1200, quality = 0.85) {
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

function extractPerSuspectFields(w) {
  return {
    photoArrest: w?.photoArrest || '',
    photoFront: w?.photoFront || '',
    photoLeft: w?.photoLeft || '',
    photoRight: w?.photoRight || '',
    photoBack: w?.photoBack || '',
    relativePrefix: w?.relativePrefix || '',
    relativeFirstName: w?.relativeFirstName || '',
    relativeLastName: w?.relativeLastName || '',
    relativePhone: w?.relativePhone || '',
    relativeRelation: w?.relativeRelation || '',
    interrogationFileUrl: w?.interrogationFileUrl || '',
  };
}

export default function ArrestRecordModal({
  isOpen,
  onClose,
  onSave,
  warrant = null,
  warrants = [],
  personnel = []
}) {
  const [dragOverSlot, setDragOverSlot] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedSuspectIds, setSelectedSuspectIds] = useState([]);
  const [perSuspectData, setPerSuspectData] = useState({});
  const [coSuspectSearch, setCoSuspectSearch] = useState('');
  const [showAllCasesSuspects, setShowAllCasesSuspects] = useState(false);
  const initializedWarrantIdRef = useRef(null);

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
    forceMajeure: '-',
    searchWarrantCourt: '',
    searchWarrantNumber: '',
    searchWarrantDate: '',
    searchLocation: '',
    seizedEvidenceCount: '',
    seizedInspectCount: '',
    seizedAmloCount: '',
    searchEndTime: '',
    seizedItemsSummary: '-',
    pleaType: 'ปฏิเสธ',
    jointArrestUnit: '',
    handoverOfficer: '',
    handoverLocation: 'กก.2 บก.ปอท.',
    handoverAddress: '',
    notifierId: '',
    recorderId: '',
    arrestingOfficers: [],
    newsLink: '',
    photoReport1: '',
    photoReport2: '',
    photoReport3: '',
    arrestRecordFileUrl: '',
    interrogationFileUrl: ''
  });

  useEffect(() => {
    if (!isOpen || !warrant) {
      initializedWarrantIdRef.current = null;
      return;
    }

    // Prevent re-initialization if already opened for this suspect (e.g. when user switches windows/tabs to copy text)
    if (initializedWarrantIdRef.current === warrant.id) {
      return;
    }
    initializedWarrantIdRef.current = warrant.id;

    const today = getTodayDMY();
    setSelectedSuspectIds([warrant.id]);
    setCoSuspectSearch('');
    setShowAllCasesSuspects(false);

    const initMap = {};
    warrants.forEach((w) => {
      if (w?.id) initMap[w.id] = extractPerSuspectFields(w);
    });
    if (warrant.id && !initMap[warrant.id]) {
      initMap[warrant.id] = extractPerSuspectFields(warrant);
    }
    setPerSuspectData(initMap);

    setFormData({
      arrestDate: toDMY(warrant.arrestDate) || today,
      arrestTime: formatTimeHHMM(warrant.arrestTime) || '09:00',
      arrestLocation: warrant.arrestLocation || '',
      arrestSubdistrict: warrant.arrestSubdistrict || '',
      arrestDistrict: warrant.arrestDistrict || '',
      arrestProvince: warrant.arrestProvince || warrant.province || 'กรุงเทพมหานคร',
      recordDate: toDMY(warrant.recordDate) || today,
      recordTime: formatTimeHHMM(warrant.recordTime) || '10:30',
      recordLocation: warrant.recordLocation || 'กก.2 บก.ปอท.',
      recordSubdistrict: warrant.recordSubdistrict || 'จอมพล',
      recordDistrict: warrant.recordDistrict || 'จตุจักร',
      recordProvince: warrant.recordProvince || 'กรุงเทพมหานคร',
      forceMajeure: warrant.forceMajeure || '-',
      searchWarrantCourt: warrant.searchWarrantCourt || '',
      searchWarrantNumber: warrant.searchWarrantNumber || '',
      searchWarrantDate: toDMY(warrant.searchWarrantDate) || '',
      searchLocation: warrant.searchLocation || '',
      seizedEvidenceCount: warrant.seizedEvidenceCount !== undefined ? String(warrant.seizedEvidenceCount) : '',
      seizedInspectCount: warrant.seizedInspectCount !== undefined ? String(warrant.seizedInspectCount) : '',
      seizedAmloCount: warrant.seizedAmloCount !== undefined ? String(warrant.seizedAmloCount) : '',
      searchEndTime: warrant.searchEndTime || '',
      seizedItemsSummary: warrant.seizedItemsSummary || '-',
      pleaType: warrant.pleaType || 'ปฏิเสธ',
      jointArrestUnit: warrant.jointArrestUnit || '',
      handoverOfficer: warrant.handoverOfficer || '',
      handoverLocation: warrant.handoverLocation || 'กก.2 บก.ปอท.',
      handoverAddress: warrant.handoverAddress || '',
      notifierId: warrant.notifierId || '',
      recorderId: warrant.recorderId || '',
      arrestingOfficers: Array.isArray(warrant.arrestingOfficers)
        ? warrant.arrestingOfficers
        : [],
      newsLink: warrant.newsLink || '',
      photoReport1: warrant.photoReport1 || '',
      photoReport2: warrant.photoReport2 || '',
      photoReport3: warrant.photoReport3 || '',
      arrestRecordFileUrl: warrant.arrestRecordFileUrl || '',
      interrogationFileUrl: warrant.interrogationFileUrl || ''
    });
  }, [isOpen, warrant?.id]);

  const primaryCaseName = (warrant?.caseName || '').trim();

  // Candidate suspects for same-location group arrest
  const candidateSuspects = useMemo(() => {
    if (!warrant) return [];
    const q = coSuspectSearch.trim().toLowerCase();
    return warrants
      .filter((w) => {
        if (!w || !w.id) return false;
        if (w.id === warrant.id) return true;
        const sameCase =
          primaryCaseName &&
          (w.caseName || '').trim().toLowerCase() === primaryCaseName.toLowerCase();
        if (!showAllCasesSuspects && !q && primaryCaseName && !sameCase) {
          return false;
        }
        if (q) {
          const full = `${w.prefix || ''}${w.firstName || ''} ${w.lastName || ''} ${w.warrantNumber || ''} ${w.caseName || ''}`.toLowerCase();
          return full.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (a.id === warrant.id) return -1;
        if (b.id === warrant.id) return 1;
        const aSame =
          primaryCaseName &&
          (a.caseName || '').trim().toLowerCase() === primaryCaseName.toLowerCase();
        const bSame =
          primaryCaseName &&
          (b.caseName || '').trim().toLowerCase() === primaryCaseName.toLowerCase();
        if (aSame !== bSame) return aSame ? -1 : 1;
        const aWanted = a.status !== 'จับกุมแล้ว';
        const bWanted = b.status !== 'จับกุมแล้ว';
        if (aWanted !== bWanted) return aWanted ? -1 : 1;
        return 0;
      });
  }, [warrant, warrants, primaryCaseName, coSuspectSearch, showAllCasesSuspects]);

  const selectedSuspects = useMemo(() => {
    if (!warrant) return [];
    const list = [];
    selectedSuspectIds.forEach((id) => {
      const found = id === warrant.id ? warrant : warrants.find((w) => w.id === id);
      if (found) list.push(found);
    });
    return list.length > 0 ? list : [warrant];
  }, [warrant, warrants, selectedSuspectIds]);

  if (!isOpen || !warrant) return null;

  const toggleSelectSuspect = (suspectId) => {
    if (suspectId === warrant.id) return; // Primary suspect stays selected
    setSelectedSuspectIds((prev) =>
      prev.includes(suspectId)
        ? prev.filter((id) => id !== suspectId)
        : [...prev, suspectId]
    );
    setPerSuspectData((prev) => {
      if (prev[suspectId]) return prev;
      const target = warrants.find((w) => w.id === suspectId);
      return { ...prev, [suspectId]: extractPerSuspectFields(target) };
    });
  };

  const selectAllSameCaseWanted = () => {
    const ids = [warrant.id];
    warrants.forEach((w) => {
      if (
        w.id !== warrant.id &&
        primaryCaseName &&
        (w.caseName || '').trim().toLowerCase() === primaryCaseName.toLowerCase() &&
        w.status !== 'จับกุมแล้ว'
      ) {
        ids.push(w.id);
      }
    });
    setSelectedSuspectIds(Array.from(new Set(ids)));
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateSuspectField = (suspectId, field, value) => {
    setPerSuspectData((prev) => ({
      ...prev,
      [suspectId]: {
        ...(prev[suspectId] || {}),
        [field]: value,
      },
    }));
  };

  const toggleArrestingOfficer = (personId) => {
    setFormData((prev) => {
      const exists = prev.arrestingOfficers.includes(personId);
      if (exists) {
        return {
          ...prev,
          arrestingOfficers: prev.arrestingOfficers.filter((id) => id !== personId)
        };
      }
      if (prev.arrestingOfficers.length >= 10) return prev;
      return {
        ...prev,
        arrestingOfficers: [...prev.arrestingOfficers, personId]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;

    const updatedBatch = selectedSuspects.map((sus) => {
      const ind = perSuspectData[sus.id] || extractPerSuspectFields(sus);
      const nextArrestRecordUrl =
        sus.id === warrant.id
          ? formData.arrestRecordFileUrl
          : formData.arrestRecordFileUrl || sus.arrestRecordFileUrl || '';
      const nextInterrogationUrl =
        sus.id === warrant.id
          ? formData.interrogationFileUrl
          : ind.interrogationFileUrl || formData.interrogationFileUrl || sus.interrogationFileUrl || '';

      return {
        ...sus,
        ...formData,
        arrestRecordFileUrl: nextArrestRecordUrl,
        interrogationFileUrl: nextInterrogationUrl,
        photoArrest: ind.photoArrest || '',
        photoFront: ind.photoFront || '',
        photoLeft: ind.photoLeft || '',
        photoRight: ind.photoRight || '',
        photoBack: ind.photoBack || '',
        relativePrefix: ind.relativePrefix || '',
        relativeFirstName: ind.relativeFirstName || '',
        relativeLastName: ind.relativeLastName || '',
        relativePhone: ind.relativePhone || '',
        relativeRelation: ind.relativeRelation || '',
        status: 'จับกุมแล้ว',
      };
    });

    try {
      setIsSaving(true);
      await onSave(updatedBatch.length === 1 ? updatedBatch[0] : updatedBatch);
      onClose();
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-1.5 rounded-lg bg-[#070D1E] border border-blue-900/60 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition';
  const labelClass = 'block text-[11px] font-semibold text-slate-300 mb-1';

  const firstSuspectData = perSuspectData[warrant.id] || extractPerSuspectFields(warrant);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl bg-[#0B142A] border border-emerald-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-950/60 via-[#0F1C3A] to-[#0B142A] border-b border-blue-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>บันทึกผลการจับกุมตัวตามหมายจับ</span>
                {selectedSuspects.length > 1 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[11px] font-extrabold">
                    จับกุมจุดเดียวกัน {selectedSuspects.length} ราย
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-emerald-300/90">
                {warrant.prefix}{warrant.firstName} {warrant.lastName} • หมายจับ {warrant.court} ที่ {warrant.warrantNumber}
                {primaryCaseName ? ` • เคส: ${primaryCaseName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 0. Multi-Suspect Same-Location Group Selector */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/50 via-[#070D1E] to-[#070D1E] border border-indigo-500/40 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>
                  จับกุมผู้ต้องหาจุดเดียวกันหลายคน (ติ๊กเลือกผู้ต้องหาที่จับสถานที่/เวลาเดียวกัน เพื่อบันทึกพร้อมกันในคราวเดียว)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {primaryCaseName && (
                  <button
                    type="button"
                    onClick={selectAllSameCaseWanted}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 text-[10px] font-semibold transition"
                  >
                    + เลือกทั้งเคส &quot;{primaryCaseName}&quot; ที่ยังไม่จับ
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowAllCasesSuspects((v) => !v)}
                  className="px-2.5 py-1 rounded-lg bg-blue-950/70 hover:bg-blue-900 border border-blue-800/60 text-slate-300 text-[10px] font-semibold transition"
                >
                  {showAllCasesSuspects ? 'แสดงเฉพาะเคสเดียวกัน' : 'แสดงผู้ต้องหาเคสอื่นด้วย'}
                </button>
                {selectedSuspects.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedSuspectIds([warrant.id])}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-semibold transition"
                  >
                    รีเซ็ตเหลือ 1 ราย
                  </button>
                )}
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={coSuspectSearch}
                onChange={(e) => setCoSuspectSearch(e.target.value)}
                placeholder="ค้นหาชื่อผู้ต้องหา หรือเลขหมายจับ เพื่อติ๊กเลือกร่วมจุดจับกุมเดียวกัน..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#050A18] border border-blue-900/60 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
              {candidateSuspects.map((sus) => {
                const isPrimary = sus.id === warrant.id;
                const isSelected = selectedSuspectIds.includes(sus.id);
                return (
                  <button
                    key={sus.id}
                    type="button"
                    onClick={() => toggleSelectSuspect(sus.id)}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-left text-xs transition ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-100 font-semibold'
                        : 'bg-[#0B142A]/90 border-blue-900/50 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                            : 'border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <span className="truncate">
                        {sus.prefix}{sus.firstName} {sus.lastName}
                      </span>
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900/80 text-amber-300 shrink-0">
                      {isPrimary ? 'หลัก' : (sus.warrantNumber || '-')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. Arrest Location & Time */}
          <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-blue-900/50 space-y-3">
            <div className="text-xs font-bold text-amber-400">
              1. วัน เวลา และสถานที่จับกุม {selectedSuspects.length > 1 ? `(ใช้ร่วมกันทั้ง ${selectedSuspects.length} ราย)` : ''}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelClass}>วันที่จับกุม *</label>
                <DateInput
                  required
                  value={formData.arrestDate}
                  onChange={(e) => updateField('arrestDate', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>เวลาจับกุม * (hh:mm)</label>
                <input
                  type="text"
                  required
                  maxLength={5}
                  value={formData.arrestTime}
                  onChange={(e) => updateField('arrestTime', e.target.value)}
                  onBlur={(e) => {
                    const fmt = formatTimeHHMM(e.target.value);
                    if (fmt !== e.target.value) updateField('arrestTime', fmt);
                  }}
                  placeholder="hh:mm (เช่น 07:30)"
                  className={`${inputClass} font-mono`}
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

          {/* 2. Record Location & Force Majeure */}
          <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-blue-900/50 space-y-3">
            <div className="text-xs font-bold text-cyan-400">2. สถานที่จัดทำบันทึกจับกุม & เหตุสุดวิสัย</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelClass}>วันที่ทำบันทึก</label>
                <DateInput
                  value={formData.recordDate}
                  onChange={(e) => updateField('recordDate', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>เวลาทำบันทึก (hh:mm)</label>
                <input
                  type="text"
                  maxLength={5}
                  value={formData.recordTime}
                  onChange={(e) => updateField('recordTime', e.target.value)}
                  onBlur={(e) => {
                    const fmt = formatTimeHHMM(e.target.value);
                    if (fmt !== e.target.value) updateField('recordTime', fmt);
                  }}
                  placeholder="hh:mm (เช่น 10:30)"
                  className={`${inputClass} font-mono`}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className={labelClass}>เหตุสุดวิสัย (ม.22 / ม.23)</label>
                <input
                  type="text"
                  value={formData.forceMajeure}
                  onChange={(e) => updateField('forceMajeure', e.target.value)}
                  placeholder="ระบุเหตุสุดวิสัย หรือใส่ - (หากไม่มี)"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>คำให้การชั้นจับกุม</label>
                <select
                  value={formData.pleaType}
                  onChange={(e) => updateField('pleaType', e.target.value)}
                  className={inputClass}
                >
                  <option value="ปฏิเสธ">ให้การปฏิเสธตลอดข้อกล่าวหา</option>
                  <option value="รับสารภาพ">ให้การรับสารภาพตลอดข้อกล่าวหา</option>
                  <option value="ภาคเสธ">ให้การภาคเสธ</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2.5 Search Warrant & Seizure Information (ข้อมูลเกี่ยวกับหมายค้นและการตรวจยึด) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-950/30 via-[#070D1E] to-[#070D1E] border border-amber-500/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-amber-400">
                ข้อมูลหมายค้น และการตรวจค้น/ตรวจยึดของกลาง (สำหรับบันทึกการจับกุม/ตรวจค้น/ยึด & รายงาน PPT)
              </div>
              <button
                type="button"
                onClick={() => {
                  const fullArrestLoc = [
                    formData.arrestLocation,
                    formData.arrestSubdistrict ? `ต.${formData.arrestSubdistrict}` : '',
                    formData.arrestDistrict ? `อ.${formData.arrestDistrict}` : '',
                    formData.arrestProvince ? `จ.${formData.arrestProvince}` : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                    .trim();
                  updateField('searchLocation', fullArrestLoc);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-300 text-[10px] font-semibold transition"
              >
                + ใช้สถานที่ตรวจค้นเดียวกับสถานที่จับกุม
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className={labelClass}>ศาลที่ออกหมายค้น</label>
                <input
                  type="text"
                  value={formData.searchWarrantCourt}
                  onChange={(e) => updateField('searchWarrantCourt', e.target.value)}
                  placeholder="เช่น ศาลจังหวัดพระนครศรีอยุธยา หรือ ศาลอาญา"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>เลขที่หมายค้น</label>
                <input
                  type="text"
                  value={formData.searchWarrantNumber}
                  onChange={(e) => updateField('searchWarrantNumber', e.target.value)}
                  placeholder="เช่น ค.212/2569"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>วันที่ออกหมายค้น</label>
                <DateInput
                  value={formData.searchWarrantDate}
                  onChange={(e) => updateField('searchWarrantDate', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <label className={labelClass}>สถานที่ทำการตรวจค้นตามหมายค้น (หากเว้นว่างจะใช้สถานที่จับกุมอัตโนมัติ)</label>
                <input
                  type="text"
                  value={formData.searchLocation}
                  onChange={(e) => updateField('searchLocation', e.target.value)}
                  placeholder="เช่น ห้อง 112 หอพิชาภัทร เลขที่ 136/49 หมู่ 7 ต.เชียงรากน้อย อ.บางปะอิน จ.พระนครศรีอยุธยา"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>เวลาเสร็จสิ้นตรวจค้น (น.)</label>
                <input
                  type="text"
                  maxLength={5}
                  value={formData.searchEndTime}
                  onChange={(e) => updateField('searchEndTime', e.target.value)}
                  placeholder="เช่น 06.55 หรือ 06:55"
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className={labelClass}>1.) ของกลางในคดี (จำนวนรายการ)</label>
                <input
                  type="text"
                  value={formData.seizedEvidenceCount}
                  onChange={(e) => updateField('seizedEvidenceCount', e.target.value)}
                  placeholder="เช่น 7 (หรือ -)"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>2.) ทรัพย์สินเพื่อตรวจสอบ (จำนวนรายการ)</label>
                <input
                  type="text"
                  value={formData.seizedInspectCount}
                  onChange={(e) => updateField('seizedInspectCount', e.target.value)}
                  placeholder="เช่น 1 (หรือ -)"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>3.) พิสูจน์ที่มาของทรัพย์สิน (จำนวนรายการ)</label>
                <input
                  type="text"
                  value={formData.seizedAmloCount}
                  onChange={(e) => updateField('seizedAmloCount', e.target.value)}
                  placeholder="เช่น 7 (หรือ -)"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>สรุปสิ่งของตรวจยึด (แสดงในสไลด์ PPT ข้อ 5)</label>
                <input
                  type="text"
                  value={formData.seizedItemsSummary}
                  onChange={(e) => updateField('seizedItemsSummary', e.target.value)}
                  placeholder="เช่น - หรือ โทรศัพท์มือถือ 2 เครื่อง"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* 3 & 4. Relative (for single suspect) & Handover */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-blue-900/50 space-y-2.5">
              <div className="text-xs font-bold text-slate-200">
                3. ญาติ/ผู้ไว้วางใจที่แจ้งการจับกุม ({warrant.prefix}{warrant.firstName})
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="คำนำหน้า"
                  value={firstSuspectData.relativePrefix}
                  onChange={(e) => updateSuspectField(warrant.id, 'relativePrefix', e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="ชื่อ"
                  value={firstSuspectData.relativeFirstName}
                  onChange={(e) => updateSuspectField(warrant.id, 'relativeFirstName', e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="นามสกุล"
                  value={firstSuspectData.relativeLastName}
                  onChange={(e) => updateSuspectField(warrant.id, 'relativeLastName', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="ความสัมพันธ์ (เช่น มารดา)"
                  value={firstSuspectData.relativeRelation}
                  onChange={(e) => updateSuspectField(warrant.id, 'relativeRelation', e.target.value)}
                  className={inputClass}
                />
                <input
                  type="text"
                  placeholder="เบอร์โทร"
                  value={firstSuspectData.relativePhone}
                  onChange={(e) => updateSuspectField(warrant.id, 'relativePhone', e.target.value)}
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

          {/* 5. Arresting Officers & Signers */}
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
                <label className={labelClass}>ผู้ควบคุมตัว / ผู้แจ้งการควบคุมตัว (ม.22 & ม.23)</label>
                <select
                  value={formData.notifierId}
                  onChange={(e) => updateField('notifierId', e.target.value)}
                  className={inputClass}
                >
                  <option value="">-- เลือกเจ้าหน้าที่ผู้ควบคุมตัว --</option>
                  {personnel.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.rank} {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>ผู้บันทึก / ผู้จัดทำบันทึกการจับกุม</label>
                <select
                  value={formData.recorderId}
                  onChange={(e) => updateField('recorderId', e.target.value)}
                  className={inputClass}
                >
                  <option value="">-- เลือกเจ้าหน้าที่ผู้บันทึก --</option>
                  {personnel.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.rank} {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className={labelClass}>เจ้าหน้าที่หน่วยร่วมจับกุม (ถ้ามี — จะแทรกบรรทัดชุดจับกุมร่วมในบันทึกการจับกุม & รายงาน LINE)</label>
                <button
                  type="button"
                  onClick={() =>
                    updateField(
                      'jointArrestUnit',
                      'เจ้าพนักงานตำรวจ กก.สายตรวจ บก.ปพ. นำโดย พ.ต.ต.พงศ์ปิติ ตรีนิคม สว.กก.สายตรวจ บก.ปพ., ร.ต.อ.ธนเดช ลีลาถาวรกุล รอง สว.กก.สายตรวจ บก.ปพ., จ.ส.ต.วัชรพงษ์ พุทธจร, ส.ต.อ.กมล แดงเหลือบ, ส.ต.ท.ธีรพงษ์ เนียนทะศาสตร์ ผบ.หมู่ กก.สายตรวจ บก.ปพ.'
                    )
                  }
                  className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 text-[10px] font-semibold transition"
                >
                  + ดึงชุด กก.สายตรวจ บก.ปพ.
                </button>
              </div>
              <input
                type="text"
                value={formData.jointArrestUnit}
                onChange={(e) => updateField('jointArrestUnit', e.target.value)}
                placeholder="เช่น เจ้าพนักงานตำรวจ กก.สายตรวจ บก.ปพ. นำโดย พ.ต.ต.พงศ์ปิติ ตรีนิคม ... (เว้นว่างหากไม่มีหน่วยร่วม)"
                className={inputClass}
              />
            </div>
          </div>

          {/* 6. Arrest & 4-Sided Suspect Photos — Continuous Individual Blocks per Suspect */}
          <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-amber-500/40 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                <span>
                  6. ภาพถ่ายขณะจับกุม & รูปผู้ต้องหา 4 ด้าน (แยกช่องรายบุคคลต่อเนื่องกัน — ทั้งหมด {selectedSuspects.length} ราย)
                </span>
              </span>
              <span className="text-[11px] text-slate-400">
                แต่ละรายจะถูกบันทึกลงโฟลเดอร์ Google Drive ของผู้ต้องหารายนั้นโดยอัตโนมัติ
              </span>
            </div>

            <div className="space-y-4">
              {selectedSuspects.map((sus, sIdx) => {
                const sData = perSuspectData[sus.id] || extractPerSuspectFields(sus);
                const filledCount = PHOTO_SLOTS.filter((sl) => Boolean(sData[sl.key])).length;

                return (
                  <div
                    key={sus.id}
                    className="p-3 rounded-xl bg-[#0B142A] border border-blue-800/70 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-blue-900/50">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-xs font-extrabold">
                          คนที่ {sIdx + 1}/{selectedSuspects.length}
                        </span>
                        <span className="text-xs font-bold text-white">
                          {sus.prefix}{sus.firstName} {sus.lastName}
                        </span>
                        <span className="text-[11px] text-amber-300 font-mono">
                          (หมายจับ {sus.warrantNumber || '-'})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {sIdx > 0 && firstSuspectData.photoArrest && (
                          <button
                            type="button"
                            onClick={() =>
                              updateSuspectField(sus.id, 'photoArrest', firstSuspectData.photoArrest)
                            }
                            className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-400/40 text-indigo-200 text-[10px] font-semibold transition"
                          >
                            <Copy className="w-3 h-3" />
                            <span>ใช้รูปขณะจับกุมเดียวกับคนที่ 1</span>
                          </button>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            filledCount === 5
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-blue-950 text-slate-300 border border-blue-800'
                          }`}
                        >
                          ใส่รูปแล้ว {filledCount}/5 มุม
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {PHOTO_SLOTS.map((slot) => {
                        const slotUid = `${sus.id}:${slot.key}`;
                        const value = sData[slot.key];
                        const isDragging = dragOverSlot === slotUid;

                        const handleFile = async (file) => {
                          if (!file) return;
                          if (!file.type.startsWith('image/')) {
                            alert('กรุณาเลือกหรือลากไฟล์รูปภาพเท่านั้น');
                            return;
                          }
                          try {
                            const compressed = await compressImageFile(file);
                            updateSuspectField(sus.id, slot.key, compressed);
                          } catch (err) {
                            alert(err.message);
                          }
                        };

                        return (
                          <div
                            key={slot.key}
                            tabIndex={0}
                            onPaste={async (e) => {
                              const items = e.clipboardData?.items;
                              if (!items) return;
                              for (const item of items) {
                                if (item.type && item.type.startsWith('image/')) {
                                  e.preventDefault();
                                  await handleFile(item.getAsFile());
                                  return;
                                }
                              }
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragOverSlot !== slotUid) setDragOverSlot(slotUid);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (dragOverSlot === slotUid) setDragOverSlot(null);
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverSlot(null);
                              const file = e.dataTransfer?.files?.[0];
                              await handleFile(file);
                            }}
                            className={`p-2 rounded-lg border flex flex-col items-center gap-1.5 transition focus:outline-none focus:border-amber-400 ${
                              isDragging
                                ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/50'
                                : 'bg-[#070D1E] border-blue-900/50'
                            }`}
                          >
                            <span className="text-[10px] font-semibold text-slate-300 text-center">
                              {slot.label}
                            </span>
                            {value ? (
                              <div className="relative w-full aspect-[3/4] rounded overflow-hidden border border-emerald-500/40 bg-black/40">
                                <img
                                  src={normalizeImageUrl(value)}
                                  alt={slot.label}
                                  onError={(e) => {
                                    const m = String(value || '').match(/([a-zA-Z0-9_-]{25,})/);
                                    if (m && !e.target.src.includes('thumbnail')) {
                                      e.target.src = `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200`;
                                    }
                                  }}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => updateSuspectField(sus.id, slot.key, '')}
                                  title="ลบรูป"
                                  className="absolute top-1 right-1 p-1 rounded bg-red-600/90 hover:bg-red-500 text-white"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="w-full aspect-[3/4] rounded border border-dashed border-blue-700/70 hover:border-amber-400/70 bg-[#0B142A]/60 flex flex-col items-center justify-center gap-1 cursor-pointer text-slate-400 hover:text-amber-300 transition text-center px-1">
                                <Upload className="w-4 h-4" />
                                <span className="text-[10px] leading-tight">
                                  {isDragging ? 'วางรูปที่นี่' : 'คลิก / ลากรูปวาง'}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    await handleFile(e.target.files?.[0]);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Per-suspect Relative Notification Info when >1 suspect */}
                    {sIdx > 0 && (
                      <div className="pt-2 border-t border-blue-900/40 grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <input
                          type="text"
                          placeholder="คำนำหน้าญาติ"
                          value={sData.relativePrefix || ''}
                          onChange={(e) => updateSuspectField(sus.id, 'relativePrefix', e.target.value)}
                          className={inputClass}
                        />
                        <input
                          type="text"
                          placeholder="ชื่อญาติที่แจ้ง"
                          value={sData.relativeFirstName || ''}
                          onChange={(e) => updateSuspectField(sus.id, 'relativeFirstName', e.target.value)}
                          className={inputClass}
                        />
                        <input
                          type="text"
                          placeholder="นามสกุลญาติ"
                          value={sData.relativeLastName || ''}
                          onChange={(e) => updateSuspectField(sus.id, 'relativeLastName', e.target.value)}
                          className={inputClass}
                        />
                        <input
                          type="text"
                          placeholder="ความเกี่ยวข้อง"
                          value={sData.relativeRelation || ''}
                          onChange={(e) => updateSuspectField(sus.id, 'relativeRelation', e.target.value)}
                          className={inputClass}
                        />
                        <input
                          type="text"
                          placeholder="เบอร์โทรญาติ"
                          value={sData.relativePhone || ''}
                          onChange={(e) => updateSuspectField(sus.id, 'relativePhone', e.target.value)}
                          className={inputClass}
                        />
                      </div>
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
                          src={normalizeImageUrl(value)}
                          alt={slot.label}
                          onError={(e) => {
                            const m = String(value || '').match(/([a-zA-Z0-9_-]{25,})/);
                            if (m && !e.target.src.includes('thumbnail')) {
                              e.target.src = `https://drive.google.com/thumbnail?id=${m[1]}&sz=w1200`;
                            }
                          }}
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
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 8. Scanned Arrest Record File & Interrogation File */}
          <div className="p-3.5 rounded-xl bg-[#070D1E]/70 border border-blue-900/50 space-y-3">
            <div className="text-xs font-bold text-amber-400">
              8. ไฟล์บันทึกจับกุมที่สแกนแล้ว & ไฟล์การซักถาม (ไม่จำกัดขนาดไฟล์ — อัปโหลดเข้าโฟลเดอร์ผู้ต้องหาใน Google Drive อัตโนมัติ)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FileDropzone
                label="1. ไฟล์บันทึกจับกุมที่สแกนแล้ว (PDF / รูปภาพ)"
                hint="ลากไฟล์บันทึกจับกุม (PDF / รูปภาพ) มาวาง หรือคลิกเลือกไฟล์ / Ctrl+V"
                value={formData.arrestRecordFileUrl}
                onChange={(val) => updateField('arrestRecordFileUrl', val)}
              />
              <FileDropzone
                label="2. ไฟล์การซักถาม (PDF / Word / รูปภาพ)"
                hint="ลากไฟล์การซักถาม (PDF / Word / รูปภาพ) มาวาง หรือคลิกเลือกไฟล์ / Ctrl+V"
                value={formData.interrogationFileUrl}
                onChange={(val) => updateField('interrogationFileUrl', val)}
              />
            </div>
          </div>

          {isSaving && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-200 text-xs font-semibold flex items-center gap-2.5">
              <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin shrink-0" />
              <span>
                กำลังอัปโหลดไฟล์และรูปภาพขึ้น Google Drive พร้อมซิงก์ข้อมูลลง Google Sheet ({selectedSuspects.length} ราย) กรุณารอสักครู่...
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-blue-900/50 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition disabled:opacity-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 text-xs font-bold shadow-md transition disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {isSaving
                  ? 'กำลังอัปโหลดลง Drive & บันทึก...'
                  : selectedSuspects.length > 1
                    ? `บันทึกผลการจับกุมพร้อมกัน (${selectedSuspects.length} ราย)`
                    : 'บันทึกผลการจับกุม'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
