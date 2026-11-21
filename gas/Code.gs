/**
 * Google Apps Script Web App API for Case Tracker by TCSD2 กก.2 บก.ปอท.
 * Spreadsheet: 12Pt5GGF-Fc2lbeIIvFgtXDNNIZPUn1ypSsAKm4pEpqs
 * Drive Folder: 1hR3GUnEhZa8PtxqofJkyDuIZb9FhylvC
 *
 * วิธีติดตั้ง:
 * 1. เปิด Google Sheet -> ส่วนขยาย (Extensions) -> Apps Script
 * 2. วางโค้ดนี้ลงใน Code.gs แล้วกดบันทึก
 * 3. กด "ทำให้ใช้งานได้" (Deploy) -> "การทำให้ใช้งานได้รายการใหม่" (New deployment)
 *    - ประเภท: เว็บแอป (Web app)
 *    - ดำเนินการในชื่อ: ฉัน (Me)
 *    - ผู้ที่มีสิทธิ์เข้าถึง: ทุกคน (Anyone)
 * 4. คัดลอก Web App URL ไปใส่ในตัวแปร GAS_WEBHOOK_URL บน Render หรือหน้าตั้งค่า Cloud ของเว็บ
 */

var SPREADSHEET_ID = '12Pt5GGF-Fc2lbeIIvFgtXDNNIZPUn1ypSsAKm4pEpqs';
var DRIVE_FOLDER_ID = '1hR3GUnEhZa8PtxqofJkyDuIZb9FhylvC';

var TAB_MAP = {
  personnel: 'ข้อมูลกำลังพล',
  cases: 'งานในความรับผิดชอบ',
  warrants: 'การจับกุม',
  operations: 'เคสคดี'
};

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    var collection = (e && e.parameter && e.parameter.collection) || 'all';
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    if (collection === 'all') {
      return jsonResponse({
        success: true,
        personnel: readTabAsObjects(ss, TAB_MAP.personnel),
        cases: readTabAsObjects(ss, TAB_MAP.cases),
        warrants: readTabAsObjects(ss, TAB_MAP.warrants),
        operations: readTabAsObjects(ss, TAB_MAP.operations)
      });
    }

    var tabName = TAB_MAP[collection];
    if (!tabName) return jsonResponse({ success: false, error: 'Unknown collection' });
    return jsonResponse({ success: true, data: readTabAsObjects(ss, tabName) });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var action = body.action || 'sync';

    if (action === 'uploadImage' || action === 'uploadFile') {
      var uploaded = saveBase64ToDrive(
        body.dataUrl,
        body.fileName || ('file_' + Date.now()),
        body.folderId || '',
        body.previousUrl || ''
      );
      return jsonResponse({
        success: true,
        url: uploaded.url,
        fileId: uploaded.fileId,
        isImage: uploaded.isImage
      });
    }

    if (action === 'ensureSuspectFolder') {
      var result = ensureSuspectFolder(body);
      return jsonResponse(result);
    }

    if (action === 'migrateExistingFilesToFolders') {
      var migrateResult = migrateExistingFilesToFolders();
      return jsonResponse(migrateResult);
    }

    if (action === 'sync') {
      var tabName = TAB_MAP[body.collection];
      if (!tabName) return jsonResponse({ success: false, error: 'Unknown collection' });
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      writeObjectsToTab(ss, tabName, body.rows || []);
      return jsonResponse({ success: true, count: (body.rows || []).length });
    }

    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.message });
  }
}

var AUTO_ID_SHEETS = {
  'การจับกุม': true,
  'เคสคดี': true,
  'งานในความรับผิดชอบ': true,
  'ข้อมูลกำลังพล': true
};

/**
 * Simple Trigger: รัน ID อัตโนมัติเมื่อมีการพิมพ์หรือวางข้อมูลในแถวใหม่ของชีท
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    var sheetName = sheet.getName();
    if (!AUTO_ID_SHEETS[sheetName]) return;

    var startRow = e.range.getRow();
    var numRows = e.range.getNumRows();
    if (startRow < 2 && startRow + numRows - 1 < 2) return;

    var firstDataRow = Math.max(2, startRow);
    var rowCount = startRow + numRows - firstDataRow;
    if (rowCount <= 0) return;

    var lastCol = sheet.getLastColumn();
    if (lastCol < 2) return;

    var headerFirst = String(sheet.getRange(1, 1).getValue() || '').trim();
    if (headerFirst !== 'ID') return;

    var rowValues = sheet.getRange(firstDataRow, 1, rowCount, lastCol).getValues();
    var baseTs = Date.now();
    for (var i = 0; i < rowValues.length; i++) {
      var row = rowValues[i];
      var currentId = String(row[0] || '').trim();
      var hasOtherData = row.slice(1).some(function(cell) {
        return String(cell || '').trim() !== '';
      });
      if (!currentId && hasOtherData) {
        sheet.getRange(firstDataRow + i, 1).setValue(String(baseTs + i));
      }
    }

    // Auto-rename Google Drive folder if Warrant Number or Suspect Name is edited in 'การจับกุม'
    if (sheetName === (TAB_MAP['warrants'] || 'การจับกุม')) {
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var colMap = {};
      for (var c = 0; c < headers.length; c++) {
        colMap[String(headers[c] || '').trim()] = c + 1;
      }
      var wnCol = colMap['เลขหมายจับ'];
      var prefixCol = colMap['คำนำหน้าชื่อผู้ต้องหา'];
      var fnCol = colMap['ชื่อผู้ต้องหา'];
      var lnCol = colMap['นามสกุลผู้ต้องหา'];
      var folderCol = colMap['Folder_ID'];
      var caseCol = colMap['Case'];

      var editedColStart = e.range.getColumn();
      var editedColEnd = editedColStart + e.range.getNumColumns() - 1;

      var relevantCols = [wnCol, prefixCol, fnCol, lnCol, caseCol].filter(Boolean);
      var isRelevant = relevantCols.some(function(col) {
        return col >= editedColStart && col <= editedColEnd;
      });

      if (isRelevant && folderCol) {
        for (var r = 0; r < rowCount; r++) {
          var currentRow = rowValues[r];
          var fid = String(currentRow[folderCol - 1] || '').trim();
          var wn = wnCol ? String(currentRow[wnCol - 1] || '').trim() : '';
          var pfx = prefixCol ? String(currentRow[prefixCol - 1] || '').trim() : '';
          var fn = fnCol ? String(currentRow[fnCol - 1] || '').trim() : '';
          var ln = lnCol ? String(currentRow[lnCol - 1] || '').trim() : '';
          var cName = caseCol ? String(currentRow[caseCol - 1] || '').trim() : '';

          if (fid || (fn || wn)) {
            try {
              var res = ensureSuspectFolder({
                caseName: cName,
                warrantNumber: wn,
                prefix: pfx,
                firstName: fn,
                lastName: ln,
                existingFolderId: fid
              });
              if (res && res.folderId && (!fid || fid !== res.folderId)) {
                sheet.getRange(firstDataRow + r, folderCol).setValue(res.folderId);
              }
              sheet.getRange(firstDataRow + r, folderCol).setNote('');
            } catch (driveErr) {
              // Simple trigger onEdit cannot call DriveApp directly; mark note so next Web App sync/read renames it
              sheet.getRange(firstDataRow + r, folderCol).setNote('NEEDS_RENAME');
            }
          }
        }
      }
    }
  } catch (err) {
    // ignore trigger errors
  }
}

function readTabAsObjects(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];
  var range = sheet.getDataRange();
  var values = range.getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var isWarrantsTab = tabName === (TAB_MAP['warrants'] || 'การจับกุม');
  var folderColIdx = -1;
  var folderNotes = null;
  if (isWarrantsTab) {
    for (var hIdx = 0; hIdx < headers.length; hIdx++) {
      if (String(headers[hIdx] || '').trim() === 'Folder_ID') {
        folderColIdx = hIdx;
        break;
      }
    }
    if (folderColIdx !== -1) {
      try {
        folderNotes = sheet.getRange(1, folderColIdx + 1, values.length, 1).getNotes();
      } catch (e) {}
    }
  }

  var out = [];
  var baseTs = Date.now();
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var hasAny = row.some(function(cell) { return String(cell || '').trim() !== ''; });
    if (!hasAny) continue;
    // Auto-assign ID in sheet if column A is ID and currently empty
    if (String(headers[0] || '').trim() === 'ID' && String(row[0] || '').trim() === '') {
      var generatedId = String(baseTs + i);
      row[0] = generatedId;
      sheet.getRange(i + 1, 1).setValue(generatedId);
    }
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      if (val instanceof Date) {
        var hdr = String(headers[j] || '');
        if (hdr.indexOf('เวลา') !== -1 || val.getFullYear() <= 1900) {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'HH:mm');
        } else {
          val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'dd/MM/yyyy');
        }
      }
      obj[headers[j]] = val === null || val === undefined ? '' : String(val);
    }

    // Process pending folder rename flagged by simple onEdit trigger
    if (isWarrantsTab && folderColIdx !== -1 && folderNotes && folderNotes[i] && folderNotes[i][0] === 'NEEDS_RENAME') {
      try {
        var renameRes = ensureSuspectFolder({
          caseName: obj['Case'] || '',
          warrantNumber: obj['เลขหมายจับ'] || '',
          prefix: obj['คำนำหน้าชื่อผู้ต้องหา'] || '',
          firstName: obj['ชื่อผู้ต้องหา'] || '',
          lastName: obj['นามสกุลผู้ต้องหา'] || '',
          existingFolderId: obj['Folder_ID'] || ''
        });
        if (renameRes && renameRes.folderId) {
          obj['Folder_ID'] = renameRes.folderId;
          sheet.getRange(i + 1, folderColIdx + 1).setValue(renameRes.folderId);
        }
        sheet.getRange(i + 1, folderColIdx + 1).setNote('');
      } catch (e) {}
    }

    out.push(obj);
  }
  return out;
}

function writeObjectsToTab(ss, tabName, rows) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }
  var lastCol = sheet.getLastColumn();
  if (lastCol === 0 && rows && rows.length > 0) {
    var autoHeaders = Object.keys(rows[0]);
    sheet.getRange(1, 1, 1, autoHeaders.length).setValues([autoHeaders]);
    lastCol = autoHeaders.length;
  }
  if (lastCol === 0) return;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // Ensure 'ชื่อเคส' column exists in 'งานในความรับผิดชอบ' so every task links to its case
  if (tabName === (TAB_MAP['cases'] || 'งานในความรับผิดชอบ')) {
    var hasCaseNameCol = headers.some(function(h) {
      return String(h || '').trim() === 'ชื่อเคส';
    });
    if (!hasCaseNameCol) {
      sheet.insertColumnAfter(1);
      sheet.getRange(1, 2).setValue('ชื่อเคส');
      lastCol = sheet.getLastColumn();
      headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    }
  }

  // Ensure 'ไฟล์บันทึกจับกุม', 'บทบาท/หน้าที่' and 'หมายเหตุ' columns exist in 'การจับกุม'
  if (tabName === (TAB_MAP['warrants'] || 'การจับกุม')) {
    var neededWarrantCols = [
      'ไฟล์บันทึกจับกุม',
      'ไฟล์การซักถาม',
      'บทบาท/หน้าที่',
      'หมายเหตุ',
      'ศาลหมายค้น',
      'เลขหมายค้น',
      'วันที่ออกหมายค้น',
      'สถานที่ตรวจค้น',
      'จำนวนของกลาง',
      'จำนวนสิ่งของตรวจยึด',
      'จำนวนสิ่งของพิสูจน์ที่มา',
      'เวลาเสร็จสิ้นการตรวจค้น',
      'สิ่งของตรวจยึด',
      'คำให้การ',
      'ชุดจับกุมหน่วยร่วม',
      'รูปแบบการจับกุม'
    ];
    for (var nc = 0; nc < neededWarrantCols.length; nc++) {
      var colTitle = neededWarrantCols[nc];
      var hasCol = headers.some(function(h) {
        return String(h || '').trim() === colTitle;
      });
      if (!hasCol) {
        lastCol += 1;
        sheet.getRange(1, lastCol).setValue(colTitle);
      }
    }
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  var isWarrantsTab = tabName === (TAB_MAP['warrants'] || 'การจับกุม');
  var existingById = {};
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    if (isWarrantsTab) {
      var prevData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      var colIdx = {};
      for (var hc = 0; hc < headers.length; hc++) {
        colIdx[String(headers[hc] || '').trim()] = hc;
      }
      for (var pr = 0; pr < prevData.length; pr++) {
        var pRow = prevData[pr];
        var pid = colIdx['ID'] !== undefined ? String(pRow[colIdx['ID']] || '').trim() : '';
        if (pid) {
          existingById[pid] = {
            folderId: colIdx['Folder_ID'] !== undefined ? String(pRow[colIdx['Folder_ID']] || '').trim() : '',
            warrantNumber: colIdx['เลขหมายจับ'] !== undefined ? String(pRow[colIdx['เลขหมายจับ']] || '').trim() : '',
            prefix: colIdx['คำนำหน้าชื่อผู้ต้องหา'] !== undefined ? String(pRow[colIdx['คำนำหน้าชื่อผู้ต้องหา']] || '').trim() : '',
            firstName: colIdx['ชื่อผู้ต้องหา'] !== undefined ? String(pRow[colIdx['ชื่อผู้ต้องหา']] || '').trim() : '',
            lastName: colIdx['นามสกุลผู้ต้องหา'] !== undefined ? String(pRow[colIdx['นามสกุลผู้ต้องหา']] || '').trim() : '',
            caseName: colIdx['Case'] !== undefined ? String(pRow[colIdx['Case']] || '').trim() : ''
          };
        }
      }
    }
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
  if (!rows || rows.length === 0) return;

  if (isWarrantsTab) {
    for (var rIdx = 0; rIdx < rows.length; rIdx++) {
      var rObj = rows[rIdx];
      var rid = String(rObj['ID'] || '').trim();
      var prevInfo = rid ? existingById[rid] : null;
      if (!rObj['Folder_ID'] && prevInfo && prevInfo.folderId) {
        rObj['Folder_ID'] = prevInfo.folderId;
      }
      var changed = !prevInfo ||
        prevInfo.warrantNumber !== String(rObj['เลขหมายจับ'] || '').trim() ||
        prevInfo.firstName !== String(rObj['ชื่อผู้ต้องหา'] || '').trim() ||
        prevInfo.lastName !== String(rObj['นามสกุลผู้ต้องหา'] || '').trim() ||
        prevInfo.prefix !== String(rObj['คำนำหน้าชื่อผู้ต้องหา'] || '').trim() ||
        prevInfo.caseName !== String(rObj['Case'] || '').trim();
      if (changed && (rObj['ชื่อผู้ต้องหา'] || rObj['เลขหมายจับ'] || rObj['Case'])) {
        try {
          var fRes = ensureSuspectFolder({
            caseName: rObj['Case'] || '',
            warrantNumber: rObj['เลขหมายจับ'] || '',
            prefix: rObj['คำนำหน้าชื่อผู้ต้องหา'] || '',
            firstName: rObj['ชื่อผู้ต้องหา'] || '',
            lastName: rObj['นามสกุลผู้ต้องหา'] || '',
            existingFolderId: rObj['Folder_ID'] || ''
          });
          if (fRes && fRes.folderId) {
            rObj['Folder_ID'] = fRes.folderId;
          }
        } catch (e) {}
      }
    }
  }

  var matrix = rows.map(function(obj) {
    return headers.map(function(h) {
      var v = obj[h];
      if (v === undefined || v === null) return '';
      var s = String(v);
      // Prevent Google Sheets 50,000 char cell limit crash if an un-offloaded data: URL ever reaches here
      if (s.length > 45000 && s.indexOf('data:') === 0) return '';
      return v;
    });
  });
  for (var c = 0; c < headers.length; c++) {
    if (String(headers[c] || '').indexOf('เวลา') !== -1) {
      sheet.getRange(2, c + 1, matrix.length, 1).setNumberFormat('@');
    }
  }
  sheet.getRange(2, 1, matrix.length, headers.length).setValues(matrix);
}

function extractDriveId(val) {
  var s = String(val || '').trim();
  if (!s) return '';
  var m = s.match(/folders\/([a-zA-Z0-9_-]+)/) || s.match(/id=([a-zA-Z0-9_-]+)/) || s.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{15,}$/.test(s)) return s;
  return '';
}

function getOrCreateSubFolder(parentFolder, name) {
  var cleanName = String(name || '').trim();
  if (!cleanName) return parentFolder;
  var iter = parentFolder.getFoldersByName(cleanName);
  if (iter.hasNext()) {
    return iter.next();
  }
  var created = parentFolder.createFolder(cleanName);
  try {
    created.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {}
  return created;
}

function buildSuspectFolderName(warrantNumber, prefix, firstName, lastName) {
  var wn = String(warrantNumber || '').trim().replace(/[\/\\:*?"<>|]/g, '-');
  var fullName = (String(prefix || '') + String(firstName || '') + (lastName ? '_' + String(lastName) : '')).trim().replace(/\s+/g, '_');
  if (wn && fullName) return wn + '_' + fullName;
  if (fullName) return fullName;
  if (wn) return wn;
  return 'ผู้ต้องหา_' + Date.now();
}

function ensureSuspectFolder(body) {
  var caseName = String(body.caseName || '').trim().replace(/[\/\\:*?"<>|]/g, '-');
  var expectedName = buildSuspectFolderName(body.warrantNumber, body.prefix, body.firstName, body.lastName);
  var fullName = (String(body.prefix || '') + String(body.firstName || '') + (body.lastName ? '_' + String(body.lastName) : '')).trim().replace(/\s+/g, '_');

  var existingId = extractDriveId(body.existingFolderId);
  var suspectFolder = null;
  var caseFolder = null;

  if (existingId) {
    try {
      var candidate = DriveApp.getFolderById(existingId);
      if (candidate && !candidate.isTrashed()) {
        suspectFolder = candidate;
        if (suspectFolder.getName() !== expectedName) {
          suspectFolder.setName(expectedName);
        }
        var parents = suspectFolder.getParents();
        var parentFolder = parents.hasNext() ? parents.next() : null;
        if (parentFolder && (!caseName || parentFolder.getName() === caseName)) {
          caseFolder = parentFolder;
        } else {
          var rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
          caseFolder = caseName ? getOrCreateSubFolder(rootFolder, caseName) : rootFolder;
          if (!parentFolder || parentFolder.getId() !== caseFolder.getId()) {
            suspectFolder.moveTo(caseFolder);
          }
        }
      }
    } catch (e) {
      suspectFolder = null;
    }
  }

  if (!caseFolder) {
    var root = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    caseFolder = caseName ? getOrCreateSubFolder(root, caseName) : root;
  }

  if (!suspectFolder) {
    var exactIter = caseFolder.getFoldersByName(expectedName);
    if (exactIter.hasNext()) {
      suspectFolder = exactIter.next();
    } else if (fullName) {
      var allFolders = caseFolder.getFolders();
      while (allFolders.hasNext()) {
        var f = allFolders.next();
        var fName = f.getName();
        if (fName === fullName || fName.slice(-(fullName.length + 1)) === '_' + fullName) {
          suspectFolder = f;
          if (fName !== expectedName) {
            suspectFolder.setName(expectedName);
          }
          break;
        }
      }
    }
    if (!suspectFolder) {
      suspectFolder = getOrCreateSubFolder(caseFolder, expectedName);
    }
  }

  if (fullName && suspectFolder) {
    try {
      var subIter = caseFolder.getFolders();
      while (subIter.hasNext()) {
        var other = subIter.next();
        if (other.getId() === suspectFolder.getId()) continue;
        var otherName = other.getName();
        if (otherName === expectedName || otherName === fullName || otherName.slice(-(fullName.length + 1)) === '_' + fullName) {
          var filesToMove = other.getFiles();
          while (filesToMove.hasNext()) {
            filesToMove.next().moveTo(suspectFolder);
          }
          other.setTrashed(true);
        }
      }
    } catch (e) {}
  }

  return {
    success: true,
    folderId: suspectFolder.getId(),
    folderUrl: suspectFolder.getUrl(),
    folderName: suspectFolder.getName(),
    caseFolderId: caseFolder.getId(),
    caseFolderUrl: caseFolder.getUrl()
  };
}

function saveBase64ToDrive(dataUrl, fileName, folderId, previousUrl) {
  var str = String(dataUrl || '');
  var commaIdx = str.indexOf(',');
  if (commaIdx === -1 || str.indexOf('data:') !== 0) {
    throw new Error('Invalid file dataUrl');
  }
  var header = str.substring(5, commaIdx);
  var mimeType = header.split(';')[0] || 'application/octet-stream';
  var base64Data = str.substring(commaIdx + 1).replace(/\s/g, '');
  var bytes = Utilities.base64Decode(base64Data);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);

  var targetFolderId = extractDriveId(folderId) || DRIVE_FOLDER_ID;
  var folder;
  try {
    folder = DriveApp.getFolderById(targetFolderId);
    if (folder.isTrashed()) {
      folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    }
  } catch (e) {
    folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  }

  // Trash previous file (by previousUrl ID or matching fileName in folder) so new upload overwrites cleanly
  var oldFileId = extractDriveId(previousUrl);
  if (oldFileId) {
    try {
      var oldFile = DriveApp.getFileById(oldFileId);
      if (oldFile && !oldFile.isTrashed()) {
        oldFile.setTrashed(true);
      }
    } catch (e) {}
  }
  try {
    var dupIter = folder.getFilesByName(fileName);
    while (dupIter.hasNext()) {
      var dup = dupIter.next();
      if (!dup.isTrashed()) {
        dup.setTrashed(true);
      }
    }
  } catch (e) {}

  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var isImage = mimeType.indexOf('image/') === 0;
  var url = isImage
    ? ('https://lh3.googleusercontent.com/d/' + file.getId())
    : ('https://drive.google.com/file/d/' + file.getId() + '/view?usp=drivesdk');

  return {
    url: url,
    fileId: file.getId(),
    isImage: isImage
  };
}

/**
 * Scan sheet 'การจับกุม', create Case > Suspect folders for all rows,
 * and move existing files from root folder into the suspect folder.
 */
function migrateExistingFilesToFolders() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(TAB_MAP['warrants'] || 'การจับกุม');
  if (!sheet) return { success: false, error: 'Sheet not found' };

  var rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return { success: true, count: 0 };

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var colMap = {};
  for (var c = 0; c < headers.length; c++) {
    colMap[String(headers[c] || '').trim()] = c + 1;
  }

  var folderIdCol = colMap['Folder_ID'];
  var caseCol = colMap['Case'];
  var wnCol = colMap['เลขหมายจับ'];
  var prefixCol = colMap['คำนำหน้าชื่อผู้ต้องหา'];
  var fnCol = colMap['ชื่อผู้ต้องหา'];
  var lnCol = colMap['นามสกุลผู้ต้องหา'];
  var idCol = colMap['ID'];

  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var processed = 0;
  var movedFiles = 0;

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var rowIndex = i + 2;
    var rawId = idCol ? String(row[idCol - 1] || '').trim() : '';
    var caseName = caseCol ? String(row[caseCol - 1] || '').trim() : '';
    var wn = wnCol ? String(row[wnCol - 1] || '').trim() : '';
    var pfx = prefixCol ? String(row[prefixCol - 1] || '').trim() : '';
    var fn = fnCol ? String(row[fnCol - 1] || '').trim() : '';
    var ln = lnCol ? String(row[lnCol - 1] || '').trim() : '';
    var existingFid = folderIdCol ? String(row[folderIdCol - 1] || '').trim() : '';

    if (!fn && !wn && !caseName) continue;

    var folderRes = ensureSuspectFolder({
      caseName: caseName,
      warrantNumber: wn,
      prefix: pfx,
      firstName: fn,
      lastName: ln,
      existingFolderId: existingFid
    });

    if (folderRes && folderRes.folderId) {
      if (folderIdCol && existingFid !== folderRes.folderId) {
        sheet.getRange(rowIndex, folderIdCol).setValue(folderRes.folderId);
      }
      processed++;

      // Move any files matching war-ID or suspect name from rootFolder to suspectFolder
      var suspectFolder = DriveApp.getFolderById(folderRes.folderId);
      var matchKeys = [];
      if (rawId) matchKeys.push(rawId);
      if (wn) matchKeys.push(wn.replace(/[\/\\:*?"<>|]/g, '-'));

      // Check all files referenced in row cells for file IDs
      for (var j = 0; j < headers.length; j++) {
        var cellVal = String(row[j] || '');
        var fileIdMatch = cellVal.match(/lh3\.googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/) ||
                          cellVal.match(/id=([a-zA-Z0-9_-]+)/) ||
                          cellVal.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch) {
          try {
            var f = DriveApp.getFileById(fileIdMatch[1]);
            var parents = f.getParents();
            var alreadyIn = false;
            while (parents.hasNext()) {
              if (parents.next().getId() === folderRes.folderId) {
                alreadyIn = true;
                break;
              }
            }
            if (!alreadyIn) {
              f.moveTo(suspectFolder);
              movedFiles++;
            }
          } catch (e) {}
        }
      }
    }
  }

  return {
    success: true,
    suspectsProcessed: processed,
    filesMoved: movedFiles
  };
}
