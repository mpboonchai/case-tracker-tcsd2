import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_FILE = path.join(__dirname, 'database', 'settings.json');

export function getGasWebhookUrl() {
  if (process.env.GAS_WEBHOOK_URL) return process.env.GAS_WEBHOOK_URL.trim();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
      if (cfg.gasWebhookUrl) return cfg.gasWebhookUrl.trim();
    }
  } catch {
    // ignore
  }
  return '';
}

export function saveGasWebhookUrl(url) {
  let cfg = {};
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      cfg = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
    }
  } catch {
    cfg = {};
  }
  cfg.gasWebhookUrl = (url || '').trim();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cfg, null, 2), 'utf8');
  return cfg.gasWebhookUrl;
}

const IMAGE_FIELDS = [
  'photoArrest',
  'photoFront',
  'photoLeft',
  'photoRight',
  'photoBack',
  'photoReport1',
  'photoReport2',
  'photoReport3',
];

/**
 * Upload any base64 data:image/... fields on a warrant to Google Drive via GAS
 * so Google Sheet cells store Drive URLs instead of >50k-char base64 strings.
 */
export async function offloadImagesToDrive(items) {
  const gasUrl = getGasWebhookUrl();
  if (!gasUrl || !Array.isArray(items)) return items;

  const updated = [];
  for (const item of items) {
    const copy = { ...item };
    for (const field of IMAGE_FIELDS) {
      const val = copy[field];
      if (typeof val === 'string' && val.startsWith('data:image/')) {
        try {
          const res = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'uploadImage',
              dataUrl: val,
              fileName: `${copy.id || 'warrant'}_${field}_${Date.now()}.jpg`,
            }),
            signal: AbortSignal.timeout(15000),
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.url) {
              copy[field] = json.url;
            }
          }
        } catch (err) {
          console.warn(`Drive upload skipped for ${field}:`, err.message);
        }
      }
    }
    updated.push(copy);
  }
  return updated;
}

function toSheetRows(collection, items, personnel = []) {
  if (collection === 'personnel') {
    return items.map((p) => ({
      'ID': p.sheetId || p.id,
      'เพศ': p.gender || '',
      'ยศ': p.rank || p.prefix || '',
      'ชื่อ': p.firstName || '',
      'สกุล': p.lastName || '',
      'ยศภาษาอังกฤษ': p.rankEn || '',
      'ชื่อภาษาอังกฤษ': p.firstNameEn || '',
      'นามสกุลภาษาอังกฤษ': p.lastNameEn || '',
      'ตำแหน่ง': p.positionDetail || p.position || '',
      'เลขประจำตัวประชาชน': p.nationalId || '',
      'วันเกิด': p.dob || '',
      'เบอร์โทรศัพท์': p.phone || '',
      'ไซส์เสื้อ': p.shirtSize || '',
      'หมู่โลหิต': p.bloodType || '',
      'ธนาคาร': p.bank || '',
      'เลขบัญชี': p.bankAccount || '',
      'QR CODE': p.qrCodeUrl || '',
      'ลิงก์รูปภาพ': p.photoUrl || '',
    }));
  }

  if (collection === 'cases') {
    return items.map((c) => ({
      'ID': String(c.id || '').replace(/^case-/, ''),
      'รายละเอียด': c.details || c.title || '',
      'ประเภทคดี': c.category || 'งานสืบสวน',
      'วันที่รับมา': c.createdAt || '',
      'สิ่งที่ดำเนินการ': c.notes || '',
      'ผู้รับผิดชอบ': c.assignedToName || '',
      'สถานะ': c.status === 'completed' ? 'เสร็จสิ้น' : c.status === 'waiting_agency' ? 'รอผลหน่วยงาน' : 'กำลังดำเนินการ',
      'ไฟล์ที่เกี่ยวข้อง': Array.isArray(c.relatedFiles) ? c.relatedFiles.join(', ') : (c.relatedFiles || ''),
      'ลิงก์ที่เกี่ยวข้อง': c.relatedLinks || '',
      'Folder ID': c.folderId || '',
    }));
  }

  if (collection === 'warrants') {
    const findP = (id) => personnel.find((p) => p.id === id) || {};
    return items.map((w) => {
      const notifier = findP(w.notifierId);
      const recorder = findP(w.recorderId);
      const row = {
        'ID': String(w.id || '').replace(/^war-/, ''),
        'Folder_ID': w.folderId || '',
        'Case': w.caseName || '',
        'ศาล': w.court || '',
        'เลขหมายจับ': w.warrantNumber || '',
        'วันที่ออกหมายจับ': w.issueDate || '',
        'ข้อหา': w.charge || '',
        'หน่วยงานเจ้าของหมายจับ': w.owner || '',
        'เพศ': w.gender || '',
        'คำนำหน้าชื่อผู้ต้องหา': w.prefix || '',
        'ชื่อผู้ต้องหา': w.firstName || '',
        'นามสกุลผู้ต้องหา': w.lastName || '',
        'วันเกิด': w.dob || '',
        'อายุ': w.age || '',
        'เลขประจำตัวประชาชน': w.nationalId || '',
        'ภาพถ่ายบุคคล': w.personPhotoUrl || '',
        'ทะเบียนราษฎร': w.houseRegUrl || '',
        'ทะเบียนราษฎร_Narai': w.naraiRegUrl || '',
        'บ้านเลขที่': w.houseNo || '',
        'หมู่': w.moo || '',
        'ถนน': w.road || '',
        'ตำบลแขวง1': w.subdistrict || '',
        'อำเภอ/เขต1': w.district || '',
        'จังหวัด1': w.province || '',
        'ไฟล์หมายจับ': w.warrantFileUrl || '',
        'สถานะ': w.status || '',
        'ไฟล์เอกสารแนบ': Array.isArray(w.relatedFiles) ? w.relatedFiles.join(', ') : '',
        'ภาพถ่ายขณะจับกุม': w.photoArrest || '',
        'ภาพด้านหน้า': w.photoFront || '',
        'ภาพด้านหลัง': w.photoBack || '',
        'ภาพด้านซ้าย': w.photoLeft || '',
        'ภาพด้านขวา': w.photoRight || '',
        'คำนำหน้าชื่อญาติ': w.relativePrefix || '',
        'ชื่อญาติ': w.relativeFirstName || '',
        'นามสกุลญาติ': w.relativeLastName || '',
        'เบอร์โทรศัพท์': w.relativePhone || '',
        'ความเกี่ยวข้อง': w.relativeRelation || '',
        'วันที่จับกุม': w.arrestDate || '',
        'เวลาที่จับกุม': w.arrestTime || '',
        'สถานที่จับกุม': w.arrestLocation || '',
        'ตำบล/แขวง2': w.arrestSubdistrict || '',
        'อำเภอ/เขต2': w.arrestDistrict || '',
        'จังหวัด2': w.arrestProvince || '',
        'วันที่บันทึก': w.recordDate || '',
        'เวลาที่บันทึก': w.recordTime || '',
        'สถานที่ทำการบันทึก': w.recordLocation || '',
        'ตำบล/แขวง3': w.recordSubdistrict || '',
        'อำเภอ/เขต3': w.recordDistrict || '',
        'จังหวัด3': w.recordProvince || '',
        'เหตุสุดวิสัย': w.forceMajeure || '',
        'จำนวนเจ้าหน้าที่ชุดจับกุม': Array.isArray(w.arrestingOfficers) ? w.arrestingOfficers.length : 0,
        'ผู้ที่นำตัวไปส่ง': w.handoverOfficer || '',
        'สถานที่นำไปส่ง': w.handoverLocation || '',
        'ยศผู้แจ้ง': notifier.prefix || '',
        'ชื่อผู้แจ้ง': notifier.firstName || '',
        'นามสกุลผู้แจ้ง': notifier.lastName || '',
        'ตำแหน่งผู้แจ้ง': notifier.positionDetail || notifier.position || '',
        'เบอร์โทรศัพท์ผู้แจ้ง': notifier.phone || '',
        'ยศผู้บันทึก': recorder.prefix || '',
        'ชื่อผู้บันทึก': recorder.firstName || '',
        'นามสกุลผู้บันทึก': recorder.lastName || '',
        'ตำแหน่งผู้บันทึก': recorder.positionDetail || recorder.position || '',
        'เบอร์โทรศัพท์ผู้บันทึก': recorder.phone || '',
        'ภาพรายงาน_1': w.photoReport1 || '',
        'ภาพรายงาน_2': w.photoReport2 || '',
        'ภาพรายงาน_3': w.photoReport3 || '',
        'ลิงก์ข่าว': w.newsLink || '',
      };
      const officerIds = Array.isArray(w.arrestingOfficers) ? w.arrestingOfficers : [];
      for (let i = 1; i <= 10; i++) {
        const p = findP(officerIds[i - 1]);
        row[`ยศคนที่ ${i}`] = p.prefix || '';
        row[`ชื่อคนที่ ${i}`] = p.firstName || '';
        row[`นามสกุลคนที่ ${i}`] = p.lastName || '';
        row[`ตำแหน่งคนที่ ${i}`] = p.positionDetail || p.position || '';
      }
      return row;
    });
  }
  return [];
}

export async function pushCollectionToGas(collection, items, personnel = []) {
  const gasUrl = getGasWebhookUrl();
  if (!gasUrl) return { synced: false };
  try {
    const rows = toSheetRows(collection, items, personnel);
    const res = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sync', collection, rows }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { synced: false, status: res.status };
    const data = await res.json();
    return { synced: !!data.success, count: data.count };
  } catch (err) {
    console.warn(`GAS sync failed for ${collection}:`, err.message);
    return { synced: false, error: err.message };
  }
}
