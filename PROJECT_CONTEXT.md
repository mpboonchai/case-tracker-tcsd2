# Case Tracker by TCSD2 (กก.2 บก.ปอท.) — Project Context

> **Standing Rule for AI Agents:** Read this file first at the start of any session to save tokens. Update this file (especially **Changelog**, **Google Sheet Columns**, and **File Map**) after completing every feature or bug fix.

---

## 1. Quick Reference & IDs
- **Live Web App (Render):** `https://case-tracker-tcsd2.onrender.com/`
- **GitHub Repo:** `https://github.com/mpboonchai/case-tracker-tcsd2.git` (branch: `main`, auto-deploys to Render)
- **Google Sheet ID:** `12Pt5GGF-Fc2lbeIIvFgtXDNNIZPUn1ypSsAKm4pEpqs`
  - `งานในความรับผิดชอบ` (GID `236665215`) — To-Do / Investigation Requests (`cases`)
  - `การจับกุม` (GID `619123280`) — Warrants & Arrest Records (`warrants`)
  - `เคสคดี` (GID `210265965`) — Case Operations (`operations`)
  - `ข้อมูลกำลังพล` (GID `0`) — Personnel (`personnel`)
- **Google Drive Root Folder ID:** `1hR3GUnEhZa8PtxqofJkyDuIZb9FhylvC`
- **Google Apps Script (GAS) Project ID:** `1gLOM14uaqEl05rzVwXATuHJc-DoIteXK6MU3bp1-uFGhTrGCQhxXESaD`
- **Important Deployment Note:** Render uses an **ephemeral filesystem**. Local `database/*.json` files reset on every redeploy/restart. **Google Sheets (via GAS Web App) is the single source of truth.** Any new field MUST be mapped in `server-gsheet.js` (`toSheetRows` + `fromSheet*`), `gas/Code.gs`, and added as a header column in Google Sheets.

---

## 2. Architecture & Key Files

### Backend (Node.js / Express — ESM)
- `server.js` — Express API (`/api/cases`, `/api/warrants`, `/api/operations`, `/api/personnel`, `/api/templates/generate`, `/api/sync-from-sheet`, `/api/config/gas`). Hydrates `database/*.json` from Google Sheets via `syncFromGoogleSheet()` (TTL: 10s). Serves built `dist/` in production.
- `server-gsheet.js` — Bi-directional sync with GAS Web App:
  - `toSheetRows(collection, items, personnel)` — Converts app JSON objects to Thai-header sheet rows.
  - `fromSheetCases`, `fromSheetWarrants`, `fromSheetOperations` — Hydrates sheet rows back to app JSON.
  - `pushCollectionToGas(collection, items, personnel)` — Per-collection serialized queue (prevents out-of-order writes on rapid clicks).
  - `offloadImagesToDrive(warrants, previousWarrants)` — Uploads base64 images/PDFs (`arrestRecordFileUrl`, `interrogationFileUrl`, arrest photos, etc.) to suspect's Drive folder via GAS.
- `server-templates.js` — Generates `.docx` / `.pptx` documents from templates using `jszip` / XML replacement:
  - Supports **dual arrest modes** via `warrant.arrestMode`:
    - `'search_combined'` (default): Uses `template file/defult template/` (จับกุมและค้นตามหมายในบันทึกเดียว).
    - `'normal'`: Uses `template file/classic template/` (จับกุมธรรมดา แยกค้น).
  - Supports **multi-suspect batch grouping** via `findGroupArrestees(warrant, allWarrants)` (groups by same `caseName` + `arrestDate` + `arrestLocation` or `arrestGroupId`, formats numbered suspect lists and short names like `นายสิทธิภาพฯ นายวัชรากรฯ`).
- `gas/Code.gs` — Google Apps Script Web App (`doGet`, `doPost`, `onEdit` auto-ID + folder rename, `readTabAsObjects`, `writeObjectsToTab`, `ensureSuspectFolder`, `saveBase64ToDrive`). Reads/writes dynamically by Row 1 headers.

### Frontend (React 19 + Vite + Tailwind CSS)
- `src/App.jsx` — Root state (`cases`, `warrants`, `operations`, `personnel`), tab routing, window-focus sync guard (skips reload while modal/input is active).
- `src/services/storage.js` — API client (`getCases`/`saveCases`, `getWarrants`/`saveWarrants`, etc.), Excel export, and `generateLineReportText(warrant, personnel, allWarrants)` (supports both `search_combined` and `normal` modes + multi-suspect formatting).
- `src/components/TodoSheetTable.jsx` — Spreadsheet-like To-Do table (`งานในความรับผิดชอบ`), grouped by `caseName`, inline editing, quick-add row, 3 checkboxes (`ขอแล้ว`, `ได้รับแล้ว`, `ดูไฟล์แล้ว`), `No.` (`docNumber`), `ปลายทาง`, `ช่องทาง`, `ผล`.
- `src/components/CaseModal.jsx` — Full modal editor for To-Do items (`useRef` init lock).
- `src/components/ArrestsView.jsx` — Warrant & Arrest records dashboard, global search (including suspect name), role display (`บทบาท/หน้าที่`), document generator buttons, interrogation file link.
- `src/components/ArrestRecordModal.jsx` — Arrest recording form:
  - `arrestMode` dropdown (`search_combined` vs `normal`)
  - Search warrant & seizure fields (`searchCourt`, `searchWarrantNumber`, `searchWarrantDate`, `searchLocation`, `evidenceCount`, `seizedCount`, `amloSeizedCount`, `searchEndTime`, `seizedItems`, `testimony`, `jointUnit`)
  - File uploads (`arrestRecordFileUrl`, `interrogationFileUrl`)
  - Photo slots with **Clipboard Paste** (`Ctrl+V` + `วางรูป` button)
  - Multi-suspect selection & `role` (`ตำแหน่ง/หน้าที่`)
- `src/components/WarrantModal.jsx` — Create/edit warrant details including `role` (`ตำแหน่ง/หน้าที่`).
- `src/components/CaseOperationsView.jsx` — Case Operations overview (`เคสคดี`) + linked suspects & search.
- `src/components/LeaderView.jsx`, `src/components/MemberView.jsx`, `src/components/CaseFilterBar.jsx` — To-Do dashboards & filtering (supports suspect-name search).

---

## 3. Google Sheet Column Summary

### `งานในความรับผิดชอบ` (`cases` — Columns A–V, 22 cols)
`ID`, `ชื่อเคส`, `รายละเอียด`, `ประเภทคดี`, `วันที่รับมา`, `สิ่งที่ดำเนินการ`, `ผู้รับผิดชอบ`, `สถานะ`, `ไฟล์ที่เกี่ยวข้อง`, `ลิงก์ที่เกี่ยวข้อง`, `Folder ID`, `เลขหนังสือ`, `ปลายทาง`, `ช่องทาง`, `ผล`, `ขอแล้ว`, `ได้รับแล้ว`, `ดูไฟล์แล้ว`, `กำหนดส่ง`, `ความสำคัญ`, `ผู้ร่วมรับผิดชอบ`, `หัวข้องาน`

### `การจับกุม` (`warrants` — Columns A–DV, 126 cols)
Includes warrant info, suspect demographics, Drive `Folder_ID`, photos, 10 arresting officers, `notifierId`, `recorderId`, `controllerId` (`ผู้ควบคุม` — used in ม.23), `ไฟล์บันทึกจับกุม`, `ไฟล์การซักถาม`, `บทบาท/หน้าที่`, `หมายเหตุ`, search warrant & seizure fields (`DJ:DU`), and `รูปแบบการจับกุม` (`DV`).

---

## 4. Template Files
- **Combined Arrest + Search (`arrestMode === 'search_combined'`):** `template file/defult template/`
  - `บันทึกการจับกุม_Template.docx`
  - `ม.22 วรรคสอง_Template.docx`
  - `ม.23_Template.docx` (uses `ผู้ควบคุม`, NOT `ผู้บันทึก`)
  - `รายงานการจับกุม_Template.pptx`
  - `รายงานไลน์.txt`
- **Normal Arrest (`arrestMode === 'normal'`):** `template file/classic template/`
  - Original pre-combined templates (`บันทึกการจับกุม_Template.docx`, `ม.22 วรรคสอง_Template.docx`, `ม.23_Template.docx`, `รายงานการจับกุม_Template.pptx`, `รายงานไลน์.txt`).

---

## 5. Dev, Build & Deploy Commands (Windows / PowerShell)
- **Build:** `cmd /c "npm run build"` (run with `BypassSandbox: true` to avoid Vite `EPERM` on Windows sandbox).
- **Deploy:** `git add . ; git commit -m "<msg>" ; git push origin main` (`BypassSandbox: true`; use `;` in PowerShell, not `&&`).
- **Google Sheets CLI (`gsheets`):** Authenticated as `mpboonchai.swh@gmail.com`.
  - Read: `gsheets readonly read 12Pt5GGF-Fc2lbeIIvFgtXDNNIZPUn1ypSsAKm4pEpqs "<Tab>!A1:Z10"`
  - Write: `gsheets mutate write 12Pt5GGF-Fc2lbeIIvFgtXDNNIZPUn1ypSsAKm4pEpqs "<Tab>!L1:V1" "col1,col2,..."`

---

## 6. Recent Changelog
- **2026-11-25:**
  - Fixed To-Do (`งานในความรับผิดชอบ`) checkbox (`ขอแล้ว`, `ได้รับแล้ว`, `ดูไฟล์แล้ว`) & `No.` (`docNumber`) reset bug on page refresh: added 11 missing columns (`L1:V1`) to Google Sheet `งานในความรับผิดชอบ`, updated `server-gsheet.js` (`toSheetRows`, `fromSheetCases`, serialized `pushCollectionToGas` queue), `gas/Code.gs`, and `server.js`.
  - Created `PROJECT_CONTEXT.md` for token-efficient future development.
- **2026-11-24 (`df2e5ae`):** Added dual `arrestMode` dropdown (`จับกุมและค้นตามหมายในบันทึกเดียว` vs `จับกุมธรรมดา แยกค้น`), restored classic templates to `template file/classic template/`, added `รูปแบบการจับกุม` column (`DV1`).
- **2026-11-24 (`720ccd9`):** Enabled global suspect-name search across views.
- **2026-11-24 (`a29b632`):** Multi-suspect batch formatting in `บันทึกการจับกุม`, `รายงานการจับกุม.pptx`, and LINE report.
- **2026-11-23 (`5500109`):** Added Clipboard Paste (`Ctrl+V` / `วางรูป`) to all photo slots + `ตำแหน่ง/หน้าที่` (`role`) column/display.
- **2026-11-23 (`9eda043`):** Added Interrogation file upload (`ไฟล์การซักถาม`) and Item 3 AMLO seizure count (`จำนวนสิ่งของพิสูจน์ที่มา`).
- **2026-11-22 (`1c70a74`):** Updated Office templates with Search Warrant & Seizure fields; fixed `ม.23` to use `ผู้ควบคุม`.
- **2026-11-19 (`98f16fa`, `1f577d6`):** Fixed tab-focus form reset bugs across modals.
