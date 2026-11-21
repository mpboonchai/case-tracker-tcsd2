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

const stripBase64ForLocalCache = (items) => {
  if (!Array.isArray(items)) return items;
  return items.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const copy = { ...item };
    for (const k of Object.keys(copy)) {
      if (typeof copy[k] === 'string' && copy[k].startsWith('data:') && copy[k].length > 100000) {
        copy[k] = '';
      }
    }
    return copy;
  });
};

const safeSetLocalStorage = (key, items) => {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    try {
      localStorage.setItem(key, JSON.stringify(stripBase64ForLocalCache(items)));
    } catch (e2) {
      console.warn(`LocalStorage quota exceeded for ${key}, relying on cloud sync:`, e2.message);
    }
  }
};

export const saveCases = async (cases) => {
  // Always update local cache safely first
  safeSetLocalStorage(STORAGE_KEYS.CASES, cases);

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

// Parse DD/MM/YYYY or YYYY-MM-DD string into a valid Date object
export const parseDateString = (dateStr) => {
  if (!dateStr) return null;
  const s = String(dateStr).trim();
  if (!s || s === '-') return null;

  // DD/MM/YYYY or D/M/YYYY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const d = new Date(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1]));
    return isNaN(d.getTime()) ? null : d;
  }

  // YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

// Calculate Days remaining or overdue
export const getDeadlineStatus = (deadlineStr) => {
  if (!deadlineStr) return { text: 'ไม่ระบุ', type: 'none', days: 0 };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const deadline = parseDateString(deadlineStr);
  if (!deadline) return { text: 'ไม่ระบุ', type: 'none', days: 0 };
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

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

export const formatThaiDateBuddhist = (dateStr, short = false) => {
  if (!dateStr) return '-';
  const d = parseDateString(dateStr);
  if (!d || isNaN(d.getTime())) return String(dateStr);
  const day = d.getDate();
  const month = short ? THAI_MONTHS_SHORT[d.getMonth()] : THAI_MONTHS_FULL[d.getMonth()];
  const year = d.getFullYear() >= 2400 ? d.getFullYear() : d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
};

export const formatThaiDateFull = (dateStr) => {
  return formatThaiDate(dateStr);
};

export const extractYear = (dateStr) => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) return dmyMatch[3];
  const isoMatch = s.match(/^(\d{4})/);
  if (isoMatch) return isoMatch[1];
  return '';
};

export const extractMonth = (dateStr) => {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) return dmyMatch[2].padStart(2, '0');
  const isoMatch = s.match(/^\d{4}-(\d{2})/);
  if (isoMatch) return isoMatch[1];
  return '';
};

/**
 * Normalize time string to HH:mm (24h).
 * Handles "9:00", "09.30", "0930", "09:00:00", ISO "1899-12-30T09:00:00",
 * and strips corrupted Google Sheets epoch dates like "1899-12-30".
 */
export const formatTimeHHMM = (val) => {
  if (!val) return '';
  const s = String(val).trim();
  if (!s || s === '-') return '';

  const isoTimeMatch = s.match(/T(\d{2}):(\d{2})/);
  if (isoTimeMatch) {
    return `${isoTimeMatch[1]}:${isoTimeMatch[2]}`;
  }

  if (/^1899-\d{2}-\d{2}$/.test(s) || /^\d{2}\/\d{2}\/1899$/.test(s)) {
    return '';
  }

  const hmMatch = s.match(/^(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?$/);
  if (hmMatch) {
    const hh = Number(hmMatch[1]);
    const mm = Number(hmMatch[2]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
  }

  const fourDigits = s.match(/^(\d{2})(\d{2})$/);
  if (fourDigits) {
    const hh = Number(fourDigits[1]);
    const mm = Number(fourDigits[2]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${fourDigits[1]}:${fourDigits[2]}`;
    }
  }

  return s;
};

/**
 * Convert Google Drive uc / file / open links to reliable embeddable CDN links (lh3.googleusercontent.com)
 * This avoids Google Drive's Cross-Origin-Resource-Policy: same-site restriction on <img> tags.
 */
export const normalizeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const s = url.trim();
  if (!s || s === '-') return '';
  if (s.startsWith('data:image/')) return s;

  const m =
    s.match(/drive\.google\.com\/uc\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i) ||
    s.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
    s.match(/drive\.google\.com\/open\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);

  if (m) {
    return `https://lh3.googleusercontent.com/d/${m[1]}`;
  }
  return s;
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
        safeSetLocalStorage(storageKey, data);
        return data;
      }
    } catch (err) {
      console.warn(`Could not load ${endpoint} from server:`, err.message);
    }
  }
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      safeSetLocalStorage(storageKey, fallbackData);
      return fallbackData;
    }
    return JSON.parse(raw);
  } catch {
    return fallbackData;
  }
};

const saveCollection = async (storageKey, endpoint, items) => {
  safeSetLocalStorage(storageKey, items);
  const settings = getSettings();
  if (settings.useCloudServer && settings.serverUrl) {
    try {
      const res = await fetch(`${settings.serverUrl.replace(/\/$/, '')}/${endpoint}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(items),
      });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json && Array.isArray(json.items)) {
          safeSetLocalStorage(storageKey, json.items);
          return json.items;
        }
      }
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
  const dob = parseDateString(dobStr);
  if (!dob) return '';
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? age : '';
};

/**
 * Find all suspects arrested in the same batch (same arrestDate + arrestLocation + arrestTime)
 */
export const findGroupArrestees = (warrant, allWarrants = []) => {
  if (!warrant) return [];
  if (!Array.isArray(allWarrants) || allWarrants.length === 0) return [warrant];
  const targetDate = String(warrant.arrestDate || '').trim();
  const targetLoc = String(warrant.arrestLocation || '').trim();
  const targetTime = String(warrant.arrestTime || '').trim();
  if (!targetDate || !targetLoc) return [warrant];

  const matched = allWarrants.filter((w) => {
    if (!w || w.id === warrant.id) return false;
    if (w.status !== 'จับกุมแล้ว') return false;
    if (String(w.arrestDate || '').trim() !== targetDate) return false;
    if (String(w.arrestLocation || '').trim() !== targetLoc) return false;
    if (targetTime && String(w.arrestTime || '').trim() && String(w.arrestTime || '').trim() !== targetTime) {
      return false;
    }
    return true;
  });

  return [warrant, ...matched];
};

const formatSuspectAddr = (w) =>
  [
    w.houseNo,
    w.moo ? `ม.${w.moo}` : '',
    w.road ? `ถ.${w.road}` : '',
    w.subdistrict ? `ต./แขวง ${w.subdistrict}` : '',
    w.district ? `อ./เขต ${w.district}` : '',
    w.province ? `จ.${w.province}` : '',
  ]
    .filter(Boolean)
    .join(' ');

/**
 * Format LINE Report message matching template file/defult template/รายงานไลน์.txt
 */
export const generateLineReportText = (warrant, personnel = [], allWarrants = []) => {
  const group = findGroupArrestees(warrant, allWarrants);
  const isMulti = group.length > 1;
  const fullName = `${warrant.prefix || ''}${warrant.firstName || ''} ${warrant.lastName || ''}`.trim();
  const shortName = `${warrant.prefix || ''}${warrant.firstName || ''}ฯ`.trim();
  const shortNamesAll = group
    .map((g) => `${g.prefix || ''}${g.firstName || ''}ฯ`.trim())
    .filter(Boolean)
    .join(' ');
  const ownerTag = warrant.owner === 'หมายจับภายนอก' ? 'หมายนอก' : 'หมายใน';

  const arrestArea = [
    warrant.arrestLocation,
    warrant.arrestSubdistrict ? `ต./แขวง ${warrant.arrestSubdistrict}` : '',
    warrant.arrestDistrict ? `อ./เขต ${warrant.arrestDistrict}` : '',
    warrant.arrestProvince ? `จ.${warrant.arrestProvince}` : '',
  ].filter(Boolean).join(' ');

  const officerList = (warrant.arrestingOfficers || [])
    .map((id) => personnel.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => `${p.prefix || p.rank || ''}${p.firstName} ${p.lastName} ${p.positionDetail || p.position}`.trim())
    .join(', ');

  const jointUnitSuffix = (warrant.jointArrestUnit || '').trim()
    ? ` ร่วมกับ${warrant.jointArrestUnit.trim()}`
    : '';
  const arrestTimeStr = formatTimeHHMM(warrant.arrestTime) || '-';
  const arrestDateFull = formatThaiDateBuddhist(warrant.arrestDate, false);
  const arrestDateShort = formatThaiDateBuddhist(warrant.arrestDate, true);
  const issueDateFull = formatThaiDateBuddhist(warrant.issueDate, false);
  const handoverLoc = warrant.handoverLocation || 'กก.2 บก.ปอท.';

  const suspectBlock = isMulti
    ? group
        .map((g, idx) => {
          const gName = `${g.prefix || ''}${g.firstName || ''} ${g.lastName || ''}`.trim();
          const gAddr = formatSuspectAddr(g);
          const gIssue = formatThaiDateBuddhist(g.issueDate, false);
          return `${idx + 1}. ${gName}${g.age ? ` อายุ ${g.age} ปี` : ''} เลขประจำตัวประชาชน ${g.nationalId || '-'} ที่อยู่ ${gAddr || '-'} ผู้ต้องหาตามหมายจับ${g.court || '-'} ที่ ${g.warrantNumber || '-'} ลงวันที่ ${gIssue}`;
        })
        .join('\n')
    : `${fullName}${warrant.age ? ` อายุ ${warrant.age} ปี` : ''} เลขประจำตัวประชาชน ${warrant.nationalId || '-'} ที่อยู่ ${formatSuspectAddr(warrant) || '-'} ผู้ต้องหาตามหมายจับ${warrant.court || '-'} ที่ ${warrant.warrantNumber || '-'} ลงวันที่ ${issueDateFull}`;

  const foundSuspectText = isMulti ? shortNamesAll : fullName;
  const shownSuspectText = isMulti ? shortNamesAll : shortName;

  // Classic ("จับกุมธรรมดา แยกค้น") LINE report format (prior to search-combined update)
  if (warrant.arrestMode === 'normal') {
    const classicOfficerList = (warrant.arrestingOfficers || [])
      .map((id) => personnel.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => `${p.prefix}${p.firstName} ${p.lastName} ${p.positionDetail || p.position}`.trim())
      .join(', ');
    const classicSuspectLine = isMulti
      ? '\n' +
        group
          .map((g, idx) => {
            const gName = `${g.prefix || ''}${g.firstName || ''} ${g.lastName || ''}`.trim();
            const gAddr = formatSuspectAddr(g);
            return `${idx + 1}. ${gName}${g.age ? ` อายุ ${g.age} ปี` : ''} เลขประจำตัวประชาชน ${g.nationalId || '-'} ที่อยู่ ${gAddr || '-'} ผู้ต้องหาตามหมายจับ${g.court || '-'} ที่ ${g.warrantNumber || '-'} ลงวันที่ ${formatThaiDateFull(g.issueDate)}`;
          })
          .join('\n')
      : `${fullName}${warrant.age ? ` อายุ ${warrant.age} ปี` : ''} เลขประจำตัวประชาชน ${warrant.nationalId || '-'} ที่อยู่ ${formatSuspectAddr(warrant) || '-'}\nผู้ต้องหาตามหมายจับ${warrant.court || '-'} ที่ ${warrant.warrantNumber || '-'} ลงวันที่ ${formatThaiDateFull(warrant.issueDate)}`;

    return `เรียนผู้บังคับบัญชาเพื่อโปรดทราบ

กก.2 บก.ปอท. ขออนุญาตรายงานผลการจับกุมผู้ต้องหาตามหมายจับ (${ownerTag}) ${group.length} ราย ดังนี้

🔵 เมื่อวันที่ ${formatThaiDateFull(warrant.arrestDate)} เวลาประมาณ ${arrestTimeStr} น.

🟡 ภายใต้การอำนวยการของ พล.ต.ท.ณัฐศักดิ์ เชาวนาศัย ผบช.ก., พล.ต.ต.อธิป พงษ์ศิวาภัย รอง ผบช.ก., พล.ต.ต.ชนันนัทธ์ สารถวัลย์แพศย์ ผบก.ปอท., พ.ต.อ.วัชรพันธ์ ศิริพากย์, พ.ต.อ.เนติ วงษ์กุหลาบ รอง ผบก.ปอท., ว่าที่ พ.ต.อ.นิธิ ตรีสุวรรณ ผกก.3 บก.ปอศ.รรท.ผกก.2 บก.ปอท., พ.ต.ท.สัตตเมธ ใจแก้ว, พ.ต.ท.ธนะ ว่องทรง รอง ผกก.2 บก.ปอท.

เจ้าหน้าที่ตำรวจชุดจับกุม นำโดย ${classicOfficerList || '-'}

🔵 ร่วมกันจับกุมผู้ต้องหาตามหมายจับ ${classicSuspectLine}

ความผิดฐาน “${warrant.charge || '-'}”

🔵 สถานที่จับกุม
${arrestArea || '-'}

🔴 นำตัวผู้ต้องหาส่ง ${warrant.handoverLocation || 'พนักงานสอบสวน กก.2 บก.ปอท.'} เพื่อดำเนินคดีตามกฎหมายต่อไป`;
  }

  return `เรียนผู้บังคับบัญชาเพื่อโปรดทราบ

กก.2 บก.ปอท. ขออนุญาตรายงานผลการจับกุมผู้ต้องหาตามหมายจับ (${ownerTag}) ${group.length} ราย ดังนี้

🔵 เมื่อวันที่ ${arrestDateFull} เวลาประมาณ ${arrestTimeStr} น.

🟡 ภายใต้การอำนวยการของ พล.ต.ท.ณัฐศักดิ์ เชาวนาศัย ผบช.ก., พล.ต.ต.อธิป พงษ์ศิวาภัย รอง ผบช.ก., พล.ต.ต.ชนันนัทธ์ สารถวัลย์แพศย์ ผบก.ปอท., พ.ต.อ.วัชรพันธ์ ศิริพากย์, พ.ต.อ.เนติ วงษ์กุหลาบ รอง ผบก.ปอท., ว่าที่ พ.ต.อ.นิธิ ตรีสุวรรณ ผกก.3 บก.ปอศ.รรท.ผกก.2 บก.ปอท., พ.ต.ท.สัตตเมธ ใจแก้ว, พ.ต.ท.ธนะ ว่องทรง รอง ผกก.2 บก.ปอท.

เจ้าหน้าที่ตำรวจชุดจับกุม นำโดย ${officerList || '-'}${jointUnitSuffix}

🔵 ร่วมกันจับกุมผู้ต้องหาตามหมายจับ ${isMulti ? '\n' + suspectBlock : suspectBlock}

ความผิดฐาน “${warrant.charge || '-'}”

🔴 พฤติการณ์การจับกุม กล่าวคือ เจ้าพนักงานตำรวจชุดจับกุม กก.2 บก.ปอท. ได้สืบสวนติดตามตัวผู้ต้องหาตามหมายจับข้างต้น โดยได้รับแจ้งจากสายลับว่า ผู้ต้องหาได้หลบหนีมาอยู่บริเวณ${arrestArea || '-'} ต่อมา (${arrestDateShort}) เจ้าพนักงานตำรวจชุดจับกุม จึงได้วางแผนและเดินทางไปเฝ้ารอสังเกตการณ์ เมื่อถึงเวลาประมาณ ${arrestTimeStr} น. ได้พบ ${foundSuspectText} อยู่บริเวณ${arrestArea || '-'} (สถานที่จับกุม) เจ้าพนักงานตำรวจชุดจับกุมจึงแสดงตนเข้าจับกุม ต่อมาได้แสดงหมายจับดังกล่าวให้ ${shownSuspectText} ดูและอ่านให้ฟัง โดย ${shownSuspectText} รับว่าเป็นบุคคลตามหมายจับนี้จริง และไม่เคยถูกจับกุมตามหมายจับนี้มาก่อน จากนั้นจึงแจ้งให้ทราบว่าจะต้องถูกจับกุมในข้อหาดังกล่าวข้างต้นพร้อมแจ้งสิทธิตามกฎหมายให้ทราบ จากนั้นนำส่งพนักงานสอบสวน ${handoverLoc} ดำเนินการต่อไป

🔵 สถานที่จับกุม
${arrestArea || '-'}

🔴 นำตัวผู้ต้องหาส่ง ${handoverLoc} เพื่อดำเนินคดีตามกฎหมายต่อไป`;
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
