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

    if (action === 'uploadImage') {
      var url = saveBase64ToDrive(body.dataUrl, body.fileName || ('img_' + Date.now() + '.jpg'));
      return jsonResponse({ success: true, url: url });
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
  } catch (err) {
    // ignore trigger errors
  }
}

function readTabAsObjects(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) return [];
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
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
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      obj[headers[j]] = val === null || val === undefined ? '' : String(val);
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

  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  }
  if (!rows || rows.length === 0) return;

  var matrix = rows.map(function(obj) {
    return headers.map(function(h) {
      var v = obj[h];
      return v === undefined || v === null ? '' : v;
    });
  });
  sheet.getRange(2, 1, matrix.length, headers.length).setValues(matrix);
}

function saveBase64ToDrive(dataUrl, fileName) {
  var match = String(dataUrl || '').match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image dataUrl');
  var mimeType = match[1];
  var bytes = Utilities.base64Decode(match[2]);
  var blob = Utilities.newBlob(bytes, mimeType, fileName);
  var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/uc?export=view&id=' + file.getId();
}
