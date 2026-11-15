import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_FILE = path.join(__dirname, 'database', 'settings.json');

const DEFAULT_GAS_WEBHOOK_URL =
  'https://script.google.com/macros/s/AKfycbzhxQA5FIRRbzsmjIcWH56qNEEOFHYAUwi5MqGG7yEZFm7z35uVAu4KCiYRuzeBWO9OrQ/exec';

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
  return DEFAULT_GAS_WEBHOOK_URL;
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
  'personPhotoUrl',
  'houseRegUrl',
  'naraiRegUrl',
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
 * Convert Google Drive uc / file / open links to reliable embeddable CDN links (lh3.googleusercontent.com)
 * This avoids Google Drive's Cross-Origin-Resource-Policy: same-site restriction on <img> tags.
 */
export function normalizeImageUrl(url) {
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
}

export function formatTimeHHMM(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (!s || s === '-') return '';
  const isoTime = s.match(/T(\d{2}):(\d{2})/);
  if (isoTime) return `${isoTime[1]}:${isoTime[2]}`;
  if (/^1899-\d{2}-\d{2}$/.test(s) || /^\d{2}\/\d{2}\/1899$/.test(s)) return '';
  const hm = s.match(/^(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?$/);
  if (hm) {
    const hh = Number(hm[1]);
    const mm = Number(hm[2]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    }
  }
  const four = s.match(/^(\d{2})(\d{2})$/);
  if (four) {
    const hh = Number(four[1]);
    const mm = Number(four[2]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${four[1]}:${four[2]}`;
    }
  }
  return s;
}

const FILE_FIELDS = [
  ...IMAGE_FIELDS,
  'warrantFileUrl',
  'arrestRecordFileUrl',
];

function inferExtensionFromDataUrl(dataUrl) {
  const m = String(dataUrl || '').match(/^data:([^;]+);base64,/i);
  if (!m) return 'bin';
  const mime = m[1].toLowerCase();
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  if (mime.includes('wordprocessingml')) return 'docx';
  if (mime.includes('msword')) return 'doc';
  if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
  return 'bin';
}

function buildUploadFileName(copy, field, ext) {
  const wn = String(copy.warrantNumber || '').trim().replace(/[\/\\:*?"<>|]/g, '-');
  const suspect = `${copy.prefix || ''}${copy.firstName || ''}_${copy.lastName || ''}`.trim().replace(/\s+/g, '_');
  const tag = [wn, suspect].filter(Boolean).join('_') || copy.id || 'warrant';
  const labelMap = {
    warrantFileUrl: 'หมายจับ',
    arrestRecordFileUrl: 'บันทึกจับกุม_สแกน',
    personPhotoUrl: 'รูปผู้ต้องหา',
    houseRegUrl: 'ทร14',
    naraiRegUrl: 'Narai',
    photoArrest: 'ขณะจับกุม',
    photoFront: 'ด้านหน้า',
    photoLeft: 'ด้านซ้าย',
    photoRight: 'ด้านขวา',
    photoBack: 'ด้านหลัง',
    photoReport1: 'รายงาน1',
    photoReport2: 'รายงาน2',
    photoReport3: 'รายงาน3',
  };
  const prefixLabel = labelMap[field] || field;
  return `${prefixLabel}_${tag}.${ext}`;
}

/**
 * Ensure Case -> Suspect folder structure exists (and rename if warrantNumber/name changed),
 * then upload any base64 data:... fields into that suspect's Drive folder.
 */
export async function offloadImagesToDrive(items, previousItems = []) {
  const gasUrl = getGasWebhookUrl();
  if (!gasUrl || !Array.isArray(items)) return items;

  const updated = [];
  for (const item of items) {
    const copy = { ...item };
    const prev = Array.isArray(previousItems) ? previousItems.find((p) => p.id === copy.id) : null;
    if (!copy.folderId && prev?.folderId) {
      copy.folderId = prev.folderId;
    }

    const hasBase64Upload = FILE_FIELDS.some(
      (f) => typeof copy[f] === 'string' && copy[f].startsWith('data:')
    );
    const metadataChanged =
      !prev ||
      (prev.warrantNumber || '') !== (copy.warrantNumber || '') ||
      (prev.firstName || '') !== (copy.firstName || '') ||
      (prev.lastName || '') !== (copy.lastName || '') ||
      (prev.prefix || '') !== (copy.prefix || '') ||
      (prev.caseName || '') !== (copy.caseName || '');

    const hasIdentity = Boolean(
      (copy.firstName || '').trim() ||
      (copy.warrantNumber || '').trim() ||
      (copy.caseName || '').trim()
    );

    if (hasIdentity && (!copy.folderId || hasBase64Upload || metadataChanged)) {
      try {
        const folderRes = await fetch(gasUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'ensureSuspectFolder',
            caseName: copy.caseName || '',
            warrantNumber: copy.warrantNumber || '',
            prefix: copy.prefix || '',
            firstName: copy.firstName || '',
            lastName: copy.lastName || '',
            existingFolderId: copy.folderId || prev?.folderId || '',
          }),
          signal: AbortSignal.timeout(30000),
        });
        if (folderRes.ok) {
          const folderJson = await folderRes.json();
          if (folderJson.success && folderJson.folderId) {
            copy.folderId = folderJson.folderId;
          }
        }
      } catch (err) {
        console.warn('Drive folder ensure skipped:', err.message);
      }
    }

    for (const field of FILE_FIELDS) {
      const val = copy[field];
      if (typeof val === 'string' && val.startsWith('data:')) {
        try {
          const ext = inferExtensionFromDataUrl(val);
          const fileName = buildUploadFileName(copy, field, ext);
          const res = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'uploadFile',
              dataUrl: val,
              fileName,
              folderId: copy.folderId || '',
            }),
            signal: AbortSignal.timeout(25000),
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.url) {
              const isImageField = IMAGE_FIELDS.includes(field) || json.isImage;
              copy[field] = isImageField ? normalizeImageUrl(json.url) : json.url;
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
        'ไฟล์บันทึกจับกุม': w.arrestRecordFileUrl || '',
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
        'เวลาที่จับกุม': formatTimeHHMM(w.arrestTime),
        'สถานที่จับกุม': w.arrestLocation || '',
        'ตำบล/แขวง2': w.arrestSubdistrict || '',
        'อำเภอ/เขต2': w.arrestDistrict || '',
        'จังหวัด2': w.arrestProvince || '',
        'วันที่บันทึก': w.recordDate || '',
        'เวลาที่บันทึก': formatTimeHHMM(w.recordTime),
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
  if (collection === 'operations') {
    const findP = (id) => personnel.find((p) => p.id === id) || {};
    return items.map((op) => {
      const lead = findP(op.leadOfficerId);
      const leadName = lead.firstName
        ? `${lead.rank || lead.prefix || ''}${lead.firstName} ${lead.lastName || ''}`.trim()
        : op.leadOfficerName || '';
      return {
        'ID': String(op.id || '').replace(/^op-/, ''),
        'รหัสเคส': op.caseCode || '',
        'ชื่อเคส': op.caseName || '',
        'สถานะเคส': op.status || 'กำลังสืบสวน',
        'รายละเอียดเคส': op.details || '',
        'รายละเอียดเพิ่มเติม/การขยายผล': op.additionalNotes || '',
        'หัวหน้าชุดรับผิดชอบ': leadName,
        'วันที่เปิดเคส': op.startDate || '',
        'ลิงก์โฟลเดอร์ Drive': op.driveFolderUrl || '',
        'ลิงก์ที่เกี่ยวข้อง': op.relatedLinks || '',
        'อัปเดตล่าสุด': op.updatedAt || '',
      };
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

function findPersonnelIdByName(personnel, prefix, firstName, lastName, fullNameStr) {
  if (!Array.isArray(personnel) || personnel.length === 0) return '';
  if (firstName) {
    const found = personnel.find(
      (p) =>
        (p.firstName || '').trim() === String(firstName).trim() &&
        (!lastName || (p.lastName || '').trim() === String(lastName).trim())
    );
    if (found) return found.id;
  }
  if (fullNameStr) {
    const target = String(fullNameStr).replace(/\s+/g, '').trim();
    const found = personnel.find((p) => {
      const full = `${p.rank || p.prefix || ''}${p.firstName || ''}${p.lastName || ''}`.replace(/\s+/g, '').trim();
      return full && (full === target || target.includes(`${p.firstName || ''}${p.lastName || ''}`));
    });
    if (found) return found.id;
  }
  return '';
}

function fromSheetWarrants(rows, personnel = [], existingWarrants = []) {
  if (!Array.isArray(rows)) return null;
  return rows
    .filter((r) => (r['ชื่อผู้ต้องหา'] || '').trim() || (r['Case'] || '').trim() || (r['เลขหมายจับ'] || '').trim())
    .map((r, idx) => {
      const rawId = String(r['ID'] || '').trim();
      const existing = existingWarrants.find(
        (w) => rawId && (String(w.id || '').replace(/^war-/, '') === rawId || w.id === rawId)
      );
      const id = existing?.id || (rawId ? (rawId.startsWith('war-') ? rawId : `war-${rawId}`) : `war-${Date.now()}-${idx}`);

      const arrestingOfficers = [];
      for (let i = 1; i <= 10; i++) {
        const fn = (r[`ชื่อคนที่ ${i}`] || '').trim();
        const ln = (r[`นามสกุลคนที่ ${i}`] || '').trim();
        if (fn) {
          const pid = findPersonnelIdByName(personnel, r[`ยศคนที่ ${i}`], fn, ln);
          if (pid) arrestingOfficers.push(pid);
        }
      }

      const notifierId =
        findPersonnelIdByName(personnel, r['ยศผู้แจ้ง'], r['ชื่อผู้แจ้ง'], r['นามสกุลผู้แจ้ง']) ||
        existing?.notifierId ||
        '';
      const recorderId =
        findPersonnelIdByName(personnel, r['ยศผู้บันทึก'], r['ชื่อผู้บันทึก'], r['นามสกุลผู้บันทึก']) ||
        existing?.recorderId ||
        '';

      return {
        ...(existing || {}),
        id,
        folderId: r['Folder_ID'] || '',
        caseName: r['Case'] || '',
        court: r['ศาล'] || '',
        warrantNumber: r['เลขหมายจับ'] || '',
        issueDate: r['วันที่ออกหมายจับ'] || '',
        charge: r['ข้อหา'] || '',
        owner: r['หน่วยงานเจ้าของหมายจับ'] || 'หมายจับภายใน',
        gender: r['เพศ'] || 'ชาย',
        prefix: r['คำนำหน้าชื่อผู้ต้องหา'] || '',
        firstName: r['ชื่อผู้ต้องหา'] || '',
        lastName: r['นามสกุลผู้ต้องหา'] || '',
        dob: r['วันเกิด'] || '',
        age: r['อายุ'] !== '' && r['อายุ'] !== undefined ? Number(r['อายุ']) || r['อายุ'] : '',
        nationalId: r['เลขประจำตัวประชาชน'] || '',
        personPhotoUrl: normalizeImageUrl(r['ภาพถ่ายบุคคล']),
        houseRegUrl: normalizeImageUrl(r['ทะเบียนราษฎร']),
        naraiRegUrl: normalizeImageUrl(r['ทะเบียนราษฎร_Narai']),
        houseNo: r['บ้านเลขที่'] || '',
        moo: r['หมู่'] || '',
        road: r['ถนน'] || '',
        subdistrict: r['ตำบลแขวง1'] || '',
        district: r['อำเภอ/เขต1'] || '',
        province: r['จังหวัด1'] || '',
        warrantFileUrl: r['ไฟล์หมายจับ'] || '',
        arrestRecordFileUrl: r['ไฟล์บันทึกจับกุม'] || existing?.arrestRecordFileUrl || '',
        status: r['สถานะ'] || 'หลบหนี',
        relatedFiles: r['ไฟล์เอกสารแนบ']
          ? String(r['ไฟล์เอกสารแนบ']).split(',').map((s) => s.trim()).filter(Boolean)
          : existing?.relatedFiles || [],
        photoArrest: normalizeImageUrl(r['ภาพถ่ายขณะจับกุม']),
        photoFront: normalizeImageUrl(r['ภาพด้านหน้า']),
        photoBack: normalizeImageUrl(r['ภาพด้านหลัง']),
        photoLeft: normalizeImageUrl(r['ภาพด้านซ้าย']),
        photoRight: normalizeImageUrl(r['ภาพด้านขวา']),
        relativePrefix: r['คำนำหน้าชื่อญาติ'] || '',
        relativeFirstName: r['ชื่อญาติ'] || '',
        relativeLastName: r['นามสกุลญาติ'] || '',
        relativePhone: r['เบอร์โทรศัพท์'] || '',
        relativeRelation: r['ความเกี่ยวข้อง'] || '',
        arrestDate: r['วันที่จับกุม'] || '',
        arrestTime: formatTimeHHMM(r['เวลาที่จับกุม']) || formatTimeHHMM(existing?.arrestTime) || '',
        arrestLocation: r['สถานที่จับกุม'] || '',
        arrestSubdistrict: r['ตำบล/แขวง2'] || '',
        arrestDistrict: r['อำเภอ/เขต2'] || '',
        arrestProvince: r['จังหวัด2'] || '',
        recordDate: r['วันที่บันทึก'] || '',
        recordTime: formatTimeHHMM(r['เวลาที่บันทึก']) || formatTimeHHMM(existing?.recordTime) || '',
        recordLocation: r['สถานที่ทำการบันทึก'] || '',
        recordSubdistrict: r['ตำบล/แขวง3'] || '',
        recordDistrict: r['อำเภอ/เขต3'] || '',
        recordProvince: r['จังหวัด3'] || '',
        forceMajeure: r['เหตุสุดวิสัย'] || '',
        arrestingOfficers: arrestingOfficers.length > 0 ? arrestingOfficers : existing?.arrestingOfficers || [],
        handoverOfficer: r['ผู้ที่นำตัวไปส่ง'] || '',
        handoverLocation: r['สถานที่นำไปส่ง'] || '',
        notifierId,
        recorderId,
        photoReport1: normalizeImageUrl(r['ภาพรายงาน_1']),
        photoReport2: normalizeImageUrl(r['ภาพรายงาน_2']),
        photoReport3: normalizeImageUrl(r['ภาพรายงาน_3']),
        newsLink: r['ลิงก์ข่าว'] || '',
      };
    });
}

function fromSheetOperations(rows, personnel = [], existingOps = []) {
  if (!Array.isArray(rows)) return null;
  return rows
    .filter((r) => (r['ชื่อเคส'] || '').trim())
    .map((r) => {
      const rawId = String(r['ID'] || '').trim();
      const existing = existingOps.find(
        (o) =>
          String(o.id || '').replace(/^op-/, '') === rawId ||
          o.id === rawId ||
          (o.caseName || '').trim().toLowerCase() === String(r['ชื่อเคส'] || '').trim().toLowerCase()
      );
      const id = existing?.id || (rawId ? (rawId.startsWith('op-') ? rawId : `op-${rawId}`) : `op-${Date.now()}`);
      const leadOfficerId =
        findPersonnelIdByName(personnel, '', '', '', r['หัวหน้าชุดรับผิดชอบ']) ||
        existing?.leadOfficerId ||
        '';
      return {
        ...(existing || {}),
        id,
        caseCode: r['รหัสเคส'] || existing?.caseCode || '',
        caseName: r['ชื่อเคส'] || '',
        status: r['สถานะเคส'] || 'กำลังสืบสวน',
        details: r['รายละเอียดเคส'] || '',
        additionalNotes: r['รายละเอียดเพิ่มเติม/การขยายผล'] || '',
        leadOfficerId,
        leadOfficerName: r['หัวหน้าชุดรับผิดชอบ'] || existing?.leadOfficerName || '',
        startDate: r['วันที่เปิดเคส'] || '',
        driveFolderUrl: r['ลิงก์โฟลเดอร์ Drive'] || '',
        relatedLinks: r['ลิงก์ที่เกี่ยวข้อง'] || '',
        updatedAt: r['อัปเดตล่าสุด'] || '',
      };
    });
}

export async function pullAllFromGas({ personnel = [], warrants = [], operations = [] } = {}) {
  const gasUrl = getGasWebhookUrl();
  if (!gasUrl) return { success: false };
  try {
    const res = await fetch(`${gasUrl}?collection=all`, {
      method: 'GET',
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { success: false, status: res.status };
    const data = await res.json();
    if (!data.success) return { success: false, error: data.error };

    const mappedWarrants = Array.isArray(data.warrants)
      ? fromSheetWarrants(data.warrants, personnel, warrants)
      : null;
    const mappedOperations = Array.isArray(data.operations)
      ? fromSheetOperations(data.operations, personnel, operations)
      : null;

    return {
      success: true,
      warrants: mappedWarrants,
      operations: mappedOperations,
    };
  } catch (err) {
    console.warn('GAS pull failed:', err.message);
    return { success: false, error: err.message };
  }
}
