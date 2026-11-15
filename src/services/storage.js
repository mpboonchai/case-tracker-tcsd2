import * as XLSX from 'xlsx';
import {
  INITIAL_CASES,
  INITIAL_USERS,
  INITIAL_PERSONNEL,
  INITIAL_WARRANTS,
  INITIAL_OPERATIONS,
  DEFAULT_GOOGLE_CONFIG
} from '../data/initialData';

const STORAGE_KEYS = {
  CASES: 'tcsd_cases_v1',
  USERS: 'tcsd_users_v2',
  PERSONNEL: 'tcsd_personnel_v1',
  WARRANTS: 'tcsd_warrants_v1',
  OPERATIONS: 'tcsd_operations_v1',
  CURRENT_USER: 'tcsd_current_user_v2',
  SETTINGS: 'tcsd_settings_v2',
};

const defaultApiUrl =
  typeof window !== 'undefined' && window.location.port !== '5173'
    ? `${window.location.origin}/api`
    : 'http://localhost:5000/api';

// Default Settings
export const DEFAULT_SETTINGS = {
  serverUrl: defaultApiUrl,
  useCloudServer: true,
  autoSync: true,
  googleConfig: { ...DEFAULT_GOOGLE_CONFIG },
  firebaseConfig: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
};

// Load settings
export const getSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
};

// Save settings
export const saveSettings = (settings) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

// Initialize or load Users
export const getUsers = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading users:', e);
    return INITIAL_USERS;
  }
};

export const saveUsers = (users) => {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
};

// Current Session
export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setCurrentUser = (user) => {
  if (user) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};

// Initialize or load Cases
export const getCases = async () => {
  const settings = getSettings();
  
  // Try remote server if enabled
  if (settings.useCloudServer && settings.serverUrl) {
    try {
      const res = await fetch(`${settings.serverUrl}/cases`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        // cache locally
        localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(data));
        return data;
      }
    } catch (err) {
      console.warn('Could not connect to cloud server, falling back to local database:', err.message);
    }
  }

  // Fallback to LocalStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CASES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(INITIAL_CASES));
      return INITIAL_CASES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading cases:', e);
    return INITIAL_CASES;
  }
};

export const saveCases = async (cases) => {
  // Always update local cache first
  localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(cases));

  const settings = getSettings();
  if (settings.useCloudServer && settings.serverUrl) {
    try {
      await fetch(`${settings.serverUrl}/cases/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cases),
      });
    } catch (err) {
      console.warn('Could not sync to cloud server:', err.message);
    }
  }
  return cases;
};

// Calculate Days remaining or overdue
export const getDeadlineStatus = (deadlineStr) => {
  if (!deadlineStr) return { text: 'ไม่ระบุ', type: 'none', days: 0 };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const deadline = new Date(deadlineStr);
  deadline.setHours(0, 0, 0, 0);
  
  const diffTime = deadline - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return {
      text: `เกินกำหนด ${Math.abs(diffDays)} วัน`,
      type: 'overdue',
      days: diffDays,
      badgeClass: 'bg-red-500/20 text-red-400 border-red-500/40 pulse-critical'
    };
  } else if (diffDays === 0) {
    return {
      text: 'ครบกำหนดวันนี้!',
      type: 'today',
      days: 0,
      badgeClass: 'bg-amber-500/25 text-amber-300 border-amber-500/50'
    };
  } else if (diffDays <= 3) {
    return {
      text: `เหลือ ${diffDays} วัน (เร่งด่วน)`,
      type: 'urgent',
      days: diffDays,
      badgeClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
    };
  } else {
    return {
      text: `เหลือ ${diffDays} วัน`,
      type: 'normal',
      days: diffDays,
      badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
    };
  }
};

// Format date to dd/mm/yyyy format
export const formatThaiDate = (dateStr) => {
  if (!dateStr) return '-';
  const s = String(dateStr).trim();
  if (!s || s === '-') return '-';

  // DD/MM/YYYY or D/M/YYYY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const dd = slashMatch[1].padStart(2, '0');
    const mm = slashMatch[2].padStart(2, '0');
    const yyyy = slashMatch[3];
    return `${dd}/${mm}/${yyyy}`;
  }

  // YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr;
  }
};

export const formatThaiDateFull = (dateStr) => {
  return formatThaiDate(dateStr);
};

// Export to Excel with Official TCSD / CIB layout
export const exportToExcel = (cases, users = []) => {
  const userMap = users.reduce((acc, u) => {
    acc[u.id] = u.name;
    return acc;
  }, {});

  const rows = cases.map((item, index) => {
    const deadlineInfo = getDeadlineStatus(item.deadline);
    let statusText = 'รอดำเนินการ';
    if (item.status === 'completed' || (item.check1_requested && item.check2_received && item.check3_verified)) {
      statusText = 'เสร็จสิ้นครบถ้วน';
    } else if (item.status === 'waiting_agency') {
      statusText = 'รอผลจากหน่วยงาน';
    } else if (item.status === 'in_progress') {
      statusText = 'อยู่ระหว่างสืบสวน';
    }

    return {
      'ลำดับ': index + 1,
      'เลขที่คดี/งาน': item.id,
      'ชื่องาน / คดีสืบสวน': item.title,
      'เลขที่หนังสือ': item.docNumber || '-',
      'หน่วยงานปลายทางที่ขอข้อมูล': item.targetAgency || '-',
      'ผู้รับผิดชอบ': userMap[item.assignedTo] || item.assignedToName || item.assignedTo,
      'วันที่ทำ': formatThaiDate(item.createdAt),
      'วันครบกำหนด (Deadline)': formatThaiDate(item.deadline),
      'สถานะกำหนดเวลา': deadlineInfo.text,
      'สถานะการสืบสวน': statusText,
      '1. ขอข้อมูลแล้ว': item.check1_requested ? '✓ เรียบร้อย' : 'ยังไม่ขอ',
      '2. ได้รับแล้ว': item.check2_received ? '✓ ได้รับแล้ว' : 'ยังไม่ได้รับ',
      '3. ตรวจสอบข้อมูลแล้ว': item.check3_verified ? '✓ ตรวจสอบแล้ว' : 'ยังไม่ตรวจ',
      'รายละเอียดคดี': item.details || '-',
      'หมายเหตุ': item.notes || '-'
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths for readability
  const colWidths = [
    { wch: 6 },  // ลำดับ
    { wch: 15 }, // เลขที่คดี
    { wch: 35 }, // ชื่องาน
    { wch: 18 }, // เลขหนังสือ
    { wch: 25 }, // หน่วยงาน
    { wch: 25 }, // ผู้รับผิดชอบ
    { wch: 14 }, // วันที่ทำ
    { wch: 15 }, // กำหนดส่ง
    { wch: 16 }, // สถานะกำหนดเวลา
    { wch: 16 }, // สถานะการสืบสวน
    { wch: 14 }, // 1. ขอข้อมูล
    { wch: 14 }, // 2. ได้รับ
    { wch: 16 }, // 3. ตรวจสอบ
    { wch: 40 }, // รายละเอียด
    { wch: 30 }  // หมายเหตุ
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'รายงานสืบสวน ปอท.');

  // Generate filename with timestamp
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `TCSD_Investigation_Tracking_${dateStr}.xlsx`);
};

// Generic collection load/save with optional cloud server sync
const getCollection = async (storageKey, endpoint, fallbackData) => {
  const settings = getSettings();
  if (settings.useCloudServer && settings.serverUrl) {
    try {
      const res = await fetch(`${settings.serverUrl.replace(/\/$/, '')}/${endpoint}`);
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem(storageKey, JSON.stringify(data));
        return data;
      }
    } catch (err) {
      console.warn(`Could not load ${endpoint} from server:`, err.message);
    }
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      localStorage.setItem(storageKey, JSON.stringify(fallbackData));
      return fallbackData;
    }
    return JSON.parse(raw);
  } catch {
    return fallbackData;
  }
};

const saveCollection = async (storageKey, endpoint, items) => {
  localStorage.setItem(storageKey, JSON.stringify(items));
  const settings = getSettings();
  if (settings.useCloudServer && settings.serverUrl) {
    try {
      await fetch(`${settings.serverUrl.replace(/\/$/, '')}/${endpoint}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      });
    } catch (err) {
      console.warn(`Could not sync ${endpoint} to server:`, err.message);
    }
  }
  return items;
};

export const getPersonnel = () => getCollection(STORAGE_KEYS.PERSONNEL, 'personnel', INITIAL_PERSONNEL);
export const savePersonnel = (list) => saveCollection(STORAGE_KEYS.PERSONNEL, 'personnel', list);

export const getWarrants = () => getCollection(STORAGE_KEYS.WARRANTS, 'warrants', INITIAL_WARRANTS);
export const saveWarrants = (list) => saveCollection(STORAGE_KEYS.WARRANTS, 'warrants', list);

export const getOperations = () => getCollection(STORAGE_KEYS.OPERATIONS, 'operations', INITIAL_OPERATIONS);
export const saveOperations = (list) => saveCollection(STORAGE_KEYS.OPERATIONS, 'operations', list);

export const calculateAge = (dobStr) => {
  if (!dobStr) return '';
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : '';
};

/**
 * Format LINE Report message matching template file/defult template/รายงานไลน์.txt
 */
export const generateLineReportText = (warrant, personnel = []) => {
  const fullName = `${warrant.prefix || ''}${warrant.firstName || ''} ${warrant.lastName || ''}`.trim();
  const ownerTag = warrant.owner === 'หมายจับภายนอก' ? 'หมายนอก' : 'หมายใน';
  const addrParts = [
    warrant.houseNo,
    warrant.moo ? `ม.${warrant.moo}` : '',
    warrant.road ? `ถ.${warrant.road}` : '',
    warrant.subdistrict ? `ต./แขวง ${warrant.subdistrict}` : '',
    warrant.district ? `อ./เขต ${warrant.district}` : '',
    warrant.province ? `จ.${warrant.province}` : '',
  ].filter(Boolean).join(' ');

  const arrestArea = [
    warrant.arrestLocation,
    warrant.arrestSubdistrict ? `ต./แขวง ${warrant.arrestSubdistrict}` : '',
    warrant.arrestDistrict ? `อ./เขต ${warrant.arrestDistrict}` : '',
    warrant.arrestProvince ? `จ.${warrant.arrestProvince}` : '',
  ].filter(Boolean).join(' ');

  const officerList = (warrant.arrestingOfficers || [])
    .map((id) => personnel.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => `${p.prefix}${p.firstName} ${p.lastName} ${p.positionDetail || p.position}`.trim())
    .join(', ');

  return `เรียนผู้บังคับบัญชาเพื่อโปรดทราบ

กก.2 บก.ปอท. ขออนุญาตรายงานผลการจับกุมผู้ต้องหาตามหมายจับ (${ownerTag}) 1 ราย ดังนี้

🔵 เมื่อวันที่ ${formatThaiDateFull(warrant.arrestDate)} เวลาประมาณ ${warrant.arrestTime || '-'} น.

🟡 ภายใต้การอำนวยการของ พล.ต.ท.ณัฐศักดิ์ เชาวนาศัย ผบช.ก., พล.ต.ต.อธิป พงษ์ศิวาภัย รอง ผบช.ก., พล.ต.ต.ชนันนัทธ์ สารถวัลย์แพศย์ ผบก.ปอท., พ.ต.อ.วัชรพันธ์ ศิริพากย์, พ.ต.อ.เนติ วงษ์กุหลาบ รอง ผบก.ปอท., ว่าที่ พ.ต.อ.นิธิ ตรีสุวรรณ ผกก.3 บก.ปอศ.รรท.ผกก.2 บก.ปอท., พ.ต.ท.สัตตเมธ ใจแก้ว, พ.ต.ท.ธนะ ว่องทรง รอง ผกก.2 บก.ปอท.

เจ้าหน้าที่ตำรวจชุดจับกุม นำโดย ${officerList || '-'}

🔵 ร่วมกันจับกุมผู้ต้องหาตามหมายจับ ${fullName}${warrant.age ? ` อายุ ${warrant.age} ปี` : ''} เลขประจำตัวประชาชน ${warrant.nationalId || '-'} ที่อยู่ ${addrParts || '-'}
ผู้ต้องหาตามหมายจับ${warrant.court || '-'} ที่ ${warrant.warrantNumber || '-'} ลงวันที่ ${formatThaiDateFull(warrant.issueDate)}

ความผิดฐาน “${warrant.charge || '-'}”

🔵 สถานที่จับกุม
${arrestArea || '-'}

🔴 นำตัวผู้ต้องหาส่ง ${warrant.handoverLocation || 'พนักงานสอบสวน กก.2 บก.ปอท.'} เพื่อดำเนินคดีตามกฎหมายต่อไป`;
};

/**
 * Call backend /api/templates/generate and download .docx / .pptx
 */
export const downloadTemplateDocument = async (type, warrant) => {
  const settings = getSettings();
  const baseUrl = (settings.serverUrl || 'http://localhost:5000/api').replace(/\/$/, '');
  const res = await fetch(`${baseUrl}/templates/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, warrant }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server error (${res.status}) — กรุณารัน server.js เพื่อสร้างไฟล์เอกสาร`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  const ext = type === 'ppt' ? 'pptx' : 'docx';
  const fileName = match ? decodeURIComponent(match[1]) : `TCSD_${type}_${warrant.warrantNumber || 'doc'}.${ext}`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};
