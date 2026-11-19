import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_DIR = path.join(__dirname, 'template file', 'defult template');

const TEMPLATE_FILES = {
  arrest_record: 'บันทึกการจับกุม_Template.docx',
  sec22: 'ม.22 วรรคสอง_Template.docx',
  sec23: 'ม.23_Template.docx',
  ppt: 'รายงานการจับกุม_Template.pptx',
};

const THAI_MONTHS_FULL = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const THAI_MONTHS_SHORT = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
];

function formatThaiDate(dateStr, short = false) {
  if (!dateStr) return '';
  const s = String(dateStr).trim();
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  let d;
  if (slashMatch) {
    d = new Date(Number(slashMatch[3]), Number(slashMatch[2]) - 1, Number(slashMatch[1]));
  } else {
    d = new Date(s);
  }
  if (!d || isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const month = short ? THAI_MONTHS_SHORT[d.getMonth()] : THAI_MONTHS_FULL[d.getMonth()];
  const year = d.getFullYear() + 543;
  return `${day} ${month} ${year}`;
}

function escapeXml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildAddress(w, includeSubdistrictPrefix = true) {
  const parts = [];
  if (w.houseNo) parts.push(w.houseNo);
  if (w.moo) parts.push(`หมู่ ${w.moo}`);
  if (w.road) parts.push(`ถ.${w.road}`);
  if (w.subdistrict) parts.push(includeSubdistrictPrefix ? `ต./แขวง ${w.subdistrict}` : w.subdistrict);
  if (w.district) parts.push(includeSubdistrictPrefix ? `อ./เขต ${w.district}` : w.district);
  if (w.province) parts.push(`จ.${w.province}`);
  return parts.join(' ').trim();
}

function buildLocationWithArea(loc, sub, dist, prov) {
  const parts = [loc];
  if (sub) parts.push(`ต./แขวง ${sub}`);
  if (dist) parts.push(`อ./เขต ${dist}`);
  if (prov) parts.push(`จ.${prov}`);
  return parts.filter(Boolean).join(' ').trim();
}

/**
 * Build placeholder key-value map matching all {{...}} tokens in the 4 Office templates.
 */
export function buildPlaceholderMap(warrant, personnel = []) {
  const findPerson = (id) => personnel.find((p) => p.id === id) || null;
  const prefix = warrant.prefix || '';
  const firstName = warrant.firstName || '';
  const lastName = warrant.lastName || '';
  const fullName = `${prefix}${firstName} ${lastName}`.trim();
  const shortName = `${prefix}${firstName}ฯ`.trim();

  const notifier = findPerson(warrant.notifierId) || {};
  const recorder = findPerson(warrant.recorderId) || {};
  const controller = findPerson(warrant.controllerId || warrant.notifierId) || notifier;

  const arrestLocFull = buildLocationWithArea(
    warrant.arrestLocation,
    warrant.arrestSubdistrict,
    warrant.arrestDistrict,
    warrant.arrestProvince
  );
  const recordLocFull = buildLocationWithArea(
    warrant.recordLocation,
    warrant.recordSubdistrict,
    warrant.recordDistrict,
    warrant.recordProvince
  );

  const relativeFull = `${warrant.relativePrefix || ''}${warrant.relativeFirstName || ''} ${warrant.relativeLastName || ''}`.trim();

  // Arresting officers 1..10
  const officerIds = Array.isArray(warrant.arrestingOfficers) ? warrant.arrestingOfficers : [];
  const officerObjects = officerIds.map((id) => findPerson(id)).filter(Boolean);
  const officerFullListStr = officerObjects
    .map((p) => `${p.prefix || p.rank || ''}${p.firstName || ''} ${p.lastName || ''} ${p.positionDetail || p.position || ''}`.trim())
    .filter(Boolean)
    .join(', ');

  const searchLocFull = (warrant.searchLocation || '').trim() || arrestLocFull;

  const map = {
    'เพศ': warrant.gender || '',
    'คำนำหน้าชื่อผู้ต้องหา': prefix,
    'ชื่อผู้ต้องหา': firstName,
    'นามสกุลผู้ต้องหา': lastName,
    'ชื่อเต็มผู้ต้องหา': fullName,
    'ชื่อย่อผู้ต้องหา': shortName,
    'อายุ': warrant.age ? String(warrant.age) : '',
    'เลขประจำตัวประชาชน': warrant.nationalId || '',
    'ที่อยู่ผู้ต้องหา': buildAddress(warrant),

    'ศาล': warrant.court || '',
    'เลขหมายจับ': warrant.warrantNumber || '',
    'วันที่ออกหมายจับ': formatThaiDate(warrant.issueDate, true),
    'วันที่ออกหมายจับแบบเต็ม': formatThaiDate(warrant.issueDate, false),
    'ข้อหา': warrant.charge || '',

    'วันที่จับกุม': formatThaiDate(warrant.arrestDate, false),
    'วันที่จับกุมแบบย่อ': formatThaiDate(warrant.arrestDate, true),
    'เวลาที่จับกุม': warrant.arrestTime || '',
    'สถานที่จับกุม': arrestLocFull,

    'วันที่บันทึก': formatThaiDate(warrant.recordDate || warrant.arrestDate, false),
    'เวลาที่บันทึก': warrant.recordTime || '',
    'สถานที่ทำการบันทึก': recordLocFull,
    'สถานที่จัดทำบันทึกย่อ': (warrant.recordLocation || '').trim() || 'กก.2 บก.ปอท.',
    'เหตุสุดวิสัย': warrant.forceMajeure || '-',

    'ชื่อเต็มญาติ': relativeFull || '-',
    'เบอร์โทรศัพท์': warrant.relativePhone || '-',
    'ความเกี่ยวข้อง': warrant.relativeRelation || '-',

    'ผู้ที่นำตัวไปส่ง': warrant.handoverOfficer || '',
    'สถานที่นำไปส่ง': warrant.handoverLocation || 'กก.2 บก.ปอท.',
    'ที่อยู่สถานที่นำตัวไปส่ง': warrant.handoverAddress || '',

    // Search Warrant & Seizure fields (ข้อมูลเกี่ยวกับหมายค้นและการตรวจยึด)
    'ศาลหมายค้น': (warrant.searchWarrantCourt || '').trim() || '........................',
    'เลขหมายค้น': (warrant.searchWarrantNumber || '').trim() || '...............',
    'วันที่ออกหมายค้น': warrant.searchWarrantDate ? formatThaiDate(warrant.searchWarrantDate, false) : '........................',
    'วันที่ออกหมายค้นแบบย่อ': warrant.searchWarrantDate ? formatThaiDate(warrant.searchWarrantDate, true) : '........................',
    'สถานที่ตรวจค้น': searchLocFull,
    'จำนวนของกลาง': warrant.seizedEvidenceCount !== undefined && String(warrant.seizedEvidenceCount).trim() !== '' ? String(warrant.seizedEvidenceCount).trim() : '-',
    'จำนวนสิ่งของตรวจยึด': warrant.seizedInspectCount !== undefined && String(warrant.seizedInspectCount).trim() !== '' ? String(warrant.seizedInspectCount).trim() : '-',
    'จำนวนสิ่งของพิสูจน์ที่มา': warrant.seizedAmloCount !== undefined && String(warrant.seizedAmloCount).trim() !== '' ? String(warrant.seizedAmloCount).trim() : '-',
    'เวลาเสร็จสิ้นการตรวจค้น': (warrant.searchEndTime || '').trim() || '............',
    'สิ่งของตรวจยึด': (warrant.seizedItemsSummary || '').trim() || '-',
    'คำให้การ': (warrant.pleaType || '').trim() || 'ปฏิเสธ',
    'รายชื่อชุดจับกุม': officerFullListStr || '-',
    'ชุดจับกุมหน่วยร่วม': (warrant.jointArrestUnit || '').trim(),

    // ผู้ควบคุมตัว (ใช้ในบันทึก ม.23 และ ม.22)
    'ยศผู้ควบคุม': controller.prefix || controller.rank || '',
    'ชื่อผู้ควบคุม': controller.firstName || '',
    'นามสกุลผู้ควบคุม': controller.lastName || '',
    'ตำแหน่งผู้ควบคุม': controller.positionDetail || controller.position || '',
    'เบอร์โทรศัพท์ผู้ควบคุม': controller.phone || '',

    // ผู้แจ้งการควบคุมตัว (ม.22)
    'ยศผู้แจ้ง': notifier.prefix || notifier.rank || '',
    'ชื่อผู้แจ้ง': notifier.firstName || '',
    'นามสกุลผู้แจ้ง': notifier.lastName || '',
    'ตำแหน่งผู้แจ้ง': notifier.positionDetail || notifier.position || '',
    'เบอร์โทรศัพท์ผู้แจ้ง': notifier.phone || '',

    // ผู้บันทึกการจับกุม
    'ยศผู้บันทึก': recorder.prefix || recorder.rank || '',
    'ชื่อผู้บันทึก': recorder.firstName || '',
    'นามสกุลผู้บันทึก': recorder.lastName || '',
    'ตำแหน่งผู้บันทึก': recorder.positionDetail || recorder.position || '',
    'เบอร์โทรศัพท์ผู้บันทึก': recorder.phone || '',

    // Image placeholders: replaced with markers first, then swapped for <w:drawing> / <p:pic>
    'ภาพถ่ายขณะจับกุม': warrant.photoArrest ? '__IMG_SLOT_photoArrest__' : '',
    'ภาพด้านหน้า': warrant.photoFront ? '__IMG_SLOT_photoFront__' : '',
    'ภาพด้านหลัง': warrant.photoBack ? '__IMG_SLOT_photoBack__' : '',
    'ภาพด้านซ้าย': warrant.photoLeft ? '__IMG_SLOT_photoLeft__' : '',
    'ภาพด้านขวา': warrant.photoRight ? '__IMG_SLOT_photoRight__' : '',
    'ภาพรายงาน_1': warrant.photoReport1 ? '__IMG_SLOT_photoReport1__' : '',
    'ภาพรายงาน_2': warrant.photoReport2 ? '__IMG_SLOT_photoReport2__' : '',
    'ภาพรายงาน_3': warrant.photoReport3 ? '__IMG_SLOT_photoReport3__' : '',
  };

  for (let i = 1; i <= 10; i++) {
    const p = findPerson(officerIds[i - 1]) || {};
    map[`ยศคนที่ ${i}`] = p.prefix || p.rank || '';
    map[`ชื่อคนที่ ${i}`] = p.firstName || '';
    map[`นามสกุลคนที่ ${i}`] = p.lastName || '';
    map[`ตำแหน่งคนที่ ${i}`] = p.positionDetail || p.position || '';
  }

  return map;
}

/**
 * Coalesce split {{...}} placeholders across <w:t> / <a:t> runs inside a single paragraph,
 * then replace all {{key}} tokens safely.
 */
function replacePlaceholdersInXml(xml, map, tagChar) {
  const pRegex = new RegExp(`<${tagChar}:p\\b[\\s\\S]*?<\\/${tagChar}:p>`, 'g');
  const tRegex = new RegExp(`(<${tagChar}:t(?:\\s[^>]*)?>)([\\s\\S]*?)(<\\/${tagChar}:t>)`, 'g');

  return xml.replace(pRegex, (paragraphXml) => {
    const matches = [...paragraphXml.matchAll(tRegex)];
    if (matches.length === 0) return paragraphXml;

    const combined = matches.map((m) => m[2]).join('');
    if (!combined.includes('{{')) return paragraphXml;

    // Coalesce split tokens by accumulating text across <t> nodes
    const texts = matches.map((m) => m[2]);
    for (let i = 0; i < texts.length; i++) {
      let openIdx = texts[i].lastIndexOf('{{');
      let closeIdx = openIdx !== -1 ? texts[i].indexOf('}}', openIdx) : -1;
      // Also handle single '{' split across boundary
      if (openIdx === -1 && texts[i].endsWith('{') && i + 1 < texts.length && texts[i + 1].startsWith('{')) {
        texts[i] += texts[i + 1][0];
        texts[i + 1] = texts[i + 1].slice(1);
        openIdx = texts[i].lastIndexOf('{{');
        closeIdx = -1;
      }
      if (openIdx !== -1 && closeIdx === -1) {
        let j = i + 1;
        while (j < texts.length) {
          const endPos = texts[j].indexOf('}}');
          if (endPos !== -1) {
            texts[i] += texts[j].slice(0, endPos + 2);
            texts[j] = texts[j].slice(endPos + 2);
            break;
          } else {
            texts[i] += texts[j];
            texts[j] = '';
            j++;
          }
        }
      }
    }

    // Replace {{key}} in each text node
    const replacedTexts = texts.map((txt) =>
      txt.replace(/\{\{([^}]*)\}\}/g, (_, rawKey) => {
        const key = rawKey.trim();
        return key in map ? escapeXml(map[key]) : '';
      })
    );

    // Rebuild paragraph XML
    let idx = 0;
    return paragraphXml.replace(tRegex, (_, openTag, _oldText, closeTag) => {
      const nextText = replacedTexts[idx++];
      return `${openTag}${nextText}${closeTag}`;
    });
  });
}

const IMAGE_SLOTS = [
  { field: 'photoArrest', label: 'ภาพถ่ายขณะจับกุม', cx: 4860000, cy: 3420000 },
  { field: 'photoFront', label: 'ภาพผู้ต้องหา ด้านหน้า', cx: 2160000, cy: 2700000 },
  { field: 'photoLeft', label: 'ภาพผู้ต้องหา ด้านซ้าย', cx: 2160000, cy: 2700000 },
  { field: 'photoRight', label: 'ภาพผู้ต้องหา ด้านขวา', cx: 2160000, cy: 2700000 },
  { field: 'photoBack', label: 'ภาพผู้ต้องหา ด้านหลัง', cx: 2160000, cy: 2700000 },
];

async function resolveImageData(val) {
  if (typeof val !== 'string' || !val.trim()) return null;
  const m = val.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
  if (m) {
    const ext = m[1].toLowerCase() === 'jpeg' ? 'jpg' : m[1].toLowerCase();
    return { ext, buffer: Buffer.from(m[2], 'base64') };
  }
  if (/^https?:\/\//i.test(val)) {
    let fetchUrl = val.trim();
    const driveMatch =
      fetchUrl.match(/drive\.google\.com\/(?:file\/d\/|uc\?(?:.*&)?id=)([a-zA-Z0-9_-]+)/i) ||
      fetchUrl.match(/drive\.google\.com\/open\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i) ||
      fetchUrl.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/i);

    const candidateUrls = [];
    if (driveMatch) {
      candidateUrls.push(`https://lh3.googleusercontent.com/d/${driveMatch[1]}`);
      candidateUrls.push(`https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`);
    } else {
      candidateUrls.push(fetchUrl);
    }

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) continue;
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (!ct.includes('image')) continue;
        const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
        const arr = await res.arrayBuffer();
        return { ext, buffer: Buffer.from(arr) };
      } catch {
        // try next candidate
      }
    }
  }
  return null;
}

function buildDrawingXml(rId, docPrId, name, cx, cy) {
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${docPrId}" name="${escapeXml(name)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${docPrId}" name="${escapeXml(name)}"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rId}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}

const PPT_IMAGE_SLOTS = [
  { field: 'photoReport1', label: 'ภาพรายงาน 1' },
  { field: 'photoReport2', label: 'ภาพรายงาน 2' },
  { field: 'photoReport3', label: 'ภาพรายงาน 3' },
];

function ensureContentTypeExtensions(zip, addedExts) {
  let typesXml = zip.file('[Content_Types].xml')?.asText() || '';
  if (!typesXml || addedExts.size === 0) return;
  const mimeMap = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  for (const ext of addedExts) {
    if (!typesXml.includes(`Extension="${ext}"`)) {
      typesXml = typesXml.replace(
        '</Types>',
        `<Default Extension="${ext}" ContentType="${mimeMap[ext] || 'image/jpeg'}"/></Types>`
      );
    }
  }
  zip.file('[Content_Types].xml', typesXml);
}

async function injectDocxImages(zip, warrant, docType) {
  const docEntry = zip.file('word/document.xml');
  const relsEntry = zip.file('word/_rels/document.xml.rels');
  if (!docEntry || !relsEntry) return;

  let docXml = docEntry.asText();
  let relsXml = relsEntry.asText();

  const addedExts = new Set();
  const unplacedSlots = [];
  let docPrId = 900;

  for (const slot of IMAGE_SLOTS) {
    const parsed = await resolveImageData(warrant[slot.field]);
    if (!parsed) continue;

    const rId = `rIdUpload_${slot.field}`;
    const mediaPath = `word/media/upload_${slot.field}.${parsed.ext}`;
    zip.file(mediaPath, parsed.buffer);
    addedExts.add(parsed.ext);

    if (!relsXml.includes(`Id="${rId}"`)) {
      relsXml = relsXml.replace(
        '</Relationships>',
        `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/upload_${slot.field}.${parsed.ext}"/></Relationships>`
      );
    }

    const marker = `__IMG_SLOT_${slot.field}__`;
    const drawingXml = buildDrawingXml(rId, ++docPrId, slot.label, slot.cx, slot.cy);
    if (docXml.includes(marker)) {
      const exactTagRegex = new RegExp(`<w:t(?:\\s[^>]*)?>${marker}<\\/w:t>`, 'g');
      docXml = docXml.replace(exactTagRegex, drawingXml);
      // Fallback if marker was inside a larger <w:t> text node
      if (docXml.includes(marker)) {
        docXml = docXml.replaceAll(marker, `</w:t></w:r><w:r>${drawingXml}</w:r><w:r><w:t>`);
      }
    } else {
      unplacedSlots.push({ ...slot, drawingXml });
    }
  }

  // Only append unplaced photos for sec23 if the template didn't already have inline slots
  if (docType === 'sec23' && unplacedSlots.length > 0) {
    const title = 'ภาพถ่ายประกอบบันทึกการควบคุมตัว (ม.23)';
    const appendixParagraphs = [
      `<w:p><w:r><w:br w:type="page"/></w:r></w:p>`,
      `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t>${title}</w:t></w:r></w:p>`,
      ...unplacedSlots.map(
        (s) =>
          `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>${escapeXml(s.label)}</w:t></w:r></w:p>` +
          `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>${s.drawingXml}</w:r></w:p>`
      ),
    ].join('');

    if (docXml.includes('<w:sectPr')) {
      const lastSectIdx = docXml.lastIndexOf('<w:sectPr');
      docXml = docXml.slice(0, lastSectIdx) + appendixParagraphs + docXml.slice(lastSectIdx);
    } else {
      docXml = docXml.replace('</w:body>', `${appendixParagraphs}</w:body>`);
    }
  }

  zip.file('word/document.xml', docXml);
  zip.file('word/_rels/document.xml.rels', relsXml);
  ensureContentTypeExtensions(zip, addedExts);
}

/**
 * Clean up empty optional joint-unit paragraph and unused officer signature rows in บันทึกการจับกุม
 */
function cleanupArrestRecordDynamicBlocks(xml, map) {
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (pXml) => {
    const tMatches = [...pXml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)];
    if (tMatches.length === 0) return pXml;
    const text = tMatches.map((m) => m[1]).join('');

    // Remove empty {{ชุดจับกุมหน่วยร่วม}} paragraph if no joint unit specified
    if (text.trim() === '{{ชุดจับกุมหน่วยร่วม}}' && !map['ชุดจับกุมหน่วยร่วม']) {
      return '';
    }

    // Check officer signature rows (pairs: 1&2, 3&4, 5&6, 7&8, 9&10)
    for (let odd = 1; odd <= 9; odd += 2) {
      const even = odd + 1;
      const hasOddToken =
        text.includes(`{{ยศคนที่ ${odd}}}`) || text.includes(`{{ชื่อคนที่ ${odd}}}`);
      const hasEvenToken =
        text.includes(`{{ยศคนที่ ${even}}}`) || text.includes(`{{ชื่อคนที่ ${even}}}`);
      if (!hasOddToken && !hasEvenToken) continue;

      const oddFilled = Boolean(map[`ชื่อคนที่ ${odd}`]);
      const evenFilled = Boolean(map[`ชื่อคนที่ ${even}`]);

      if (!oddFilled && !evenFilled) {
        return '';
      }
      if (oddFilled && !evenFilled) {
        // Strip the right-hand signature column when only the left officer is filled
        return pXml
          .replace(new RegExp(`\\(ลงชื่อ\\)\\s*\\{\\{ยศคนที่ ${even}\\}\\}[.…]+ผู้จับกุม\\s*`, 'g'), '')
          .replace(new RegExp(`\\(\\s*\\{\\{ชื่อคนที่ ${even}\\}\\}\\s*\\{\\{นามสกุลคนที่ ${even}\\}\\}\\s*\\)\\s*`, 'g'), '');
      }
    }

    return pXml;
  });
}

async function injectPptxImages(zip, warrant) {
  const addedExts = new Set();
  const parsedImages = {};
  for (const slot of PPT_IMAGE_SLOTS) {
    const parsed = await resolveImageData(warrant[slot.field]);
    if (parsed) {
      parsedImages[slot.field] = parsed;
      zip.file(`ppt/media/upload_${slot.field}.${parsed.ext}`, parsed.buffer);
      addedExts.add(parsed.ext);
    }
  }

  if (Object.keys(parsedImages).length === 0) return;

  let picIdCounter = 950;
  Object.keys(zip.files).forEach((entryName) => {
    const slideMatch = entryName.match(/^ppt\/slides\/(slide\d+\.xml)$/);
    if (!slideMatch) return;

    let slideXml = zip.files[entryName].asText();
    const relsPath = `ppt/slides/_rels/${slideMatch[1]}.rels`;
    let relsXml = zip.file(relsPath)?.asText() || '';
    let modified = false;

    for (const slot of PPT_IMAGE_SLOTS) {
      const parsed = parsedImages[slot.field];
      if (!parsed) continue;
      const marker = `__IMG_SLOT_${slot.field}__`;
      if (!slideXml.includes(marker)) continue;

      const rId = `rIdUpload_${slot.field}`;
      if (relsXml && !relsXml.includes(`Id="${rId}"`)) {
        relsXml = relsXml.replace(
          '</Relationships>',
          `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/upload_${slot.field}.${parsed.ext}"/></Relationships>`
        );
      }

      slideXml = slideXml.replace(/<p:sp\b[\s\S]*?<\/p:sp>/g, (spXml) => {
        if (!spXml.includes(marker)) return spXml;
        modified = true;
        const spPrMatch = spXml.match(/<p:spPr>[\s\S]*?<\/p:spPr>/);
        const spPrXml = spPrMatch
          ? spPrMatch[0]
          : '<p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="3000000" cy="2000000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>';
        const picId = ++picIdCounter;
        return `<p:pic><p:nvPicPr><p:cNvPr id="${picId}" name="${escapeXml(slot.label)}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill>${spPrXml}</p:pic>`;
      });
    }

    if (modified) {
      zip.file(entryName, slideXml);
      if (relsXml) zip.file(relsPath, relsXml);
    }
  });

  ensureContentTypeExtensions(zip, addedExts);
}

/**
 * Generate a filled .docx or .pptx Buffer from the default template.
 */
export async function generateDocumentBuffer(type, warrant, personnel = []) {
  const fileName = TEMPLATE_FILES[type];
  if (!fileName) {
    throw new Error(`Unknown template type: ${type}`);
  }

  const filePath = path.join(TEMPLATE_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Template file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath);
  const zip = new PizZip(content);
  const map = buildPlaceholderMap(warrant, personnel);
  const isPpt = type === 'ppt';
  const tagChar = isPpt ? 'a' : 'w';

  const xmlPattern = isPpt
    ? /^ppt\/slides\/slide\d+\.xml$/
    : /^word\/(document|header\d+|footer\d+)\.xml$/;

  Object.keys(zip.files).forEach((entryName) => {
    if (xmlPattern.test(entryName)) {
      let xml = zip.files[entryName].asText();
      if (type === 'arrest_record' && entryName === 'word/document.xml') {
        xml = cleanupArrestRecordDynamicBlocks(xml, map);
      }
      const updated = replacePlaceholdersInXml(xml, map, tagChar);
      zip.file(entryName, updated);
    }
  });

  if (!isPpt) {
    await injectDocxImages(zip, warrant, type);
  } else {
    await injectPptxImages(zip, warrant);
  }

  const buffer = zip.generate({
    type: 'nodebuffer',
    compression: 'DEFLATE',
  });

  return {
    buffer,
    fileName,
    mimeType: isPpt
      ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}
