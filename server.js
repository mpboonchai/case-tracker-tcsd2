import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateDocumentBuffer } from './server-templates.js';
import {
  getGasWebhookUrl,
  saveGasWebhookUrl,
  offloadImagesToDrive,
  pushCollectionToGas,
  pullAllFromGas,
} from './server-gsheet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));

// Ensure database directory exists
const DB_DIR = path.join(__dirname, 'database');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const CASES_FILE = path.join(DB_DIR, 'cases.json');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const PERSONNEL_FILE = path.join(DB_DIR, 'personnel.json');
const WARRANTS_FILE = path.join(DB_DIR, 'warrants.json');
const OPERATIONS_FILE = path.join(DB_DIR, 'operations.json');

// Helper to read/write JSON files safely
const readJson = (file, defaultData = []) => {
  try {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const content = fs.readFileSync(file, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    return defaultData;
  }
};

const writeJson = (file, data) => {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${file}:`, err);
    return false;
  }
};

// API Endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'TCSD Case Intelligence API',
    timestamp: new Date().toISOString()
  });
});

// GET all cases (sync from Google Sheet if stale)
app.get('/api/cases', async (req, res) => {
  if (Date.now() - lastSheetPullAt > SHEET_PULL_TTL_MS) {
    await syncFromGoogleSheet();
  }
  const cases = readJson(CASES_FILE, []);
  res.json(cases);
});

// CREATE a case
app.post('/api/cases', (req, res) => {
  const newCase = req.body;
  if (!newCase.id) {
    newCase.id = `case-${Date.now()}`;
  }
  const cases = readJson(CASES_FILE, []);
  cases.push(newCase);
  writeJson(CASES_FILE, cases);
  res.status(201).json(newCase);
});

// UPDATE a case
app.put('/api/cases/:id', (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const cases = readJson(CASES_FILE, []);
  const index = cases.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Case not found' });
  }
  cases[index] = { ...cases[index], ...updatedData };
  writeJson(CASES_FILE, cases);
  res.json(cases[index]);
});

// DELETE a case
app.delete('/api/cases/:id', (req, res) => {
  const { id } = req.params;
  let cases = readJson(CASES_FILE, []);
  cases = cases.filter(c => c.id !== id);
  writeJson(CASES_FILE, cases);
  res.json({ success: true, id });
});

// SYNC ALL CASES (Batch upload + Real-time Google Sheet sync)
app.post('/api/cases/sync', async (req, res) => {
  const cases = req.body;
  if (Array.isArray(cases)) {
    writeJson(CASES_FILE, cases);
    const gas = await pushCollectionToGas('cases', cases);
    lastSheetPullAt = Date.now();
    res.json({ success: true, count: cases.length, googleSheetSynced: gas.synced });
  } else {
    res.status(400).json({ error: 'Invalid data format' });
  }
});

// Ensure every caseName referenced in warrants exists as a real row in operations ('เคสคดี')
function materializeWarrantOperations(operations = [], warrants = []) {
  const ops = Array.isArray(operations) ? [...operations] : [];
  const existingKeys = new Set(
    ops.map((o) => (o.caseName || '').trim().toLowerCase()).filter(Boolean)
  );
  let added = 0;
  const now = new Date();
  const todayDMY = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

  for (const w of warrants) {
    const rawName = (w.caseName || '').trim();
    if (!rawName) continue;
    const key = rawName.toLowerCase();
    if (existingKeys.has(key)) continue;

    existingKeys.add(key);
    added++;
    ops.push({
      id: `op-${Date.now()}-${added}`,
      caseCode: `TCSD2-69-${String(ops.length + 1).padStart(3, '0')}`,
      caseName: rawName,
      status: 'กำลังสืบสวน',
      details: `เคสปฏิบัติการ (${rawName})`,
      additionalNotes: '',
      leadOfficerId: 'per-1560300297622',
      leadOfficerName: 'ร.ต.อ.บุญชัย ถิรภัทรไพบูลย์',
      startDate: w.issueDate || todayDMY,
      driveFolderUrl: rawName === 'Best Market Place' ? 'https://drive.google.com/drive/folders/1tA0FX1ZMrOne_0J3ldU-rH7BFyaYrKID' : '',
      relatedLinks: '',
      updatedAt: todayDMY,
    });
  }
  return { ops, added };
}

// Shared CRUD registration for Personnel, Warrants & Operations
let lastSheetPullAt = 0;
const SHEET_PULL_TTL_MS = 10000;

const registerCollectionRoutes = (routeName, filePath, idPrefix) => {
  app.get(`/api/${routeName}`, async (_req, res) => {
    if (
      (routeName === 'warrants' || routeName === 'operations') &&
      Date.now() - lastSheetPullAt > SHEET_PULL_TTL_MS
    ) {
      await syncFromGoogleSheet();
    }
    res.json(readJson(filePath, []));
  });

  app.post(`/api/${routeName}`, (req, res) => {
    const item = req.body;
    if (!item.id) item.id = `${idPrefix}-${Date.now()}`;
    const list = readJson(filePath, []);
    list.push(item);
    writeJson(filePath, list);
    res.status(201).json(item);
  });

  app.put(`/api/${routeName}/:id`, (req, res) => {
    const { id } = req.params;
    const list = readJson(filePath, []);
    const index = list.findIndex((i) => i.id === id);
    if (index === -1) return res.status(404).json({ error: 'Not found' });
    list[index] = { ...list[index], ...req.body };
    writeJson(filePath, list);
    res.json(list[index]);
  });

  app.delete(`/api/${routeName}/:id`, (req, res) => {
    const { id } = req.params;
    const list = readJson(filePath, []).filter((i) => i.id !== id);
    writeJson(filePath, list);
    res.json({ success: true, id });
  });

  app.post(`/api/${routeName}/sync`, async (req, res) => {
    if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Invalid data format' });
    let items = req.body;
    if (routeName === 'warrants' && getGasWebhookUrl()) {
      const previousItems = readJson(filePath, []);
      items = await offloadImagesToDrive(items, previousItems);
    }
    writeJson(filePath, items);
    const personnel = readJson(PERSONNEL_FILE, []);
    const gas = await pushCollectionToGas(routeName, items, personnel);
    if (routeName === 'warrants') {
      const currentOps = readJson(OPERATIONS_FILE, []);
      const { ops, added } = materializeWarrantOperations(currentOps, items);
      if (added > 0) {
        writeJson(OPERATIONS_FILE, ops);
        await pushCollectionToGas('operations', ops, personnel);
      }
    }
    lastSheetPullAt = Date.now();
    res.json({ success: true, count: items.length, googleSheetSynced: gas.synced, items });
  });
};

registerCollectionRoutes('personnel', PERSONNEL_FILE, 'per');
registerCollectionRoutes('warrants', WARRANTS_FILE, 'war');
registerCollectionRoutes('operations', OPERATIONS_FILE, 'op');

// GAS Web App Webhook Config
app.get('/api/config/gas', (_req, res) => {
  const url = getGasWebhookUrl();
  res.json({ configured: !!url, gasWebhookUrl: url });
});

app.post('/api/config/gas', (req, res) => {
  const saved = saveGasWebhookUrl(req.body?.gasWebhookUrl || '');
  res.json({ success: true, configured: !!saved, gasWebhookUrl: saved });
});

// Template Document Generation (.docx / .pptx)
app.post('/api/templates/generate', async (req, res) => {
  try {
    const { type, warrant } = req.body || {};
    if (!type || !warrant) {
      return res.status(400).json({ error: 'Missing type or warrant payload' });
    }
    const personnel = readJson(PERSONNEL_FILE, []);
    const allWarrants = readJson(WARRANTS_FILE, []);
    const { buffer, fileName, mimeType } = await generateDocumentBuffer(type, warrant, personnel, allWarrants);
    const suspectLabel = `${warrant.firstName || 'suspect'}_${warrant.warrantNumber || ''}`.replace(/[^\w\u0E00-\u0E7F.-]+/g, '_');
    const outName = `${fileName.replace(/_Template(\.\w+)$/, '')}_${suspectLabel}${path.extname(fileName)}`;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(outName)}`);
    res.send(buffer);
  } catch (err) {
    console.error('Template generation error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate document' });
  }
});

// LOGIN Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = readJson(USERS_FILE, []);
  const user = users.find(u => u.username === username && u.password === password);
  if (user) {
    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } else {
    res.status(401).json({ success: false, error: 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง' });
  }
});

// Pull latest Warrants & Case Operations from Google Sheet (prevents data loss across Render redeploys)
async function syncFromGoogleSheet() {
  try {
    const personnel = readJson(PERSONNEL_FILE, []);
    const localCases = readJson(CASES_FILE, []);
    const localWarrants = readJson(WARRANTS_FILE, []);
    const localOperations = readJson(OPERATIONS_FILE, []);
    const pulled = await pullAllFromGas({
      cases: localCases,
      personnel,
      warrants: localWarrants,
      operations: localOperations,
    });
    if (!pulled.success) return { synced: false, error: pulled.error };

    if (Array.isArray(pulled.cases)) {
      writeJson(CASES_FILE, pulled.cases);
    }
    if (Array.isArray(pulled.warrants)) {
      const syncedWarrants = await offloadImagesToDrive(pulled.warrants, localWarrants);
      writeJson(WARRANTS_FILE, syncedWarrants);
    }
    if (Array.isArray(pulled.operations)) {
      writeJson(OPERATIONS_FILE, pulled.operations);
    }
    lastSheetPullAt = Date.now();
    console.log(
      `[GAS Sync] Hydrated from Google Sheet: cases=${pulled.cases?.length ?? 0}, warrants=${pulled.warrants?.length ?? 0}, operations=${pulled.operations?.length ?? 0}`
    );
    return {
      synced: true,
      casesCount: pulled.cases?.length ?? 0,
      warrantsCount: pulled.warrants?.length ?? 0,
      operationsCount: pulled.operations?.length ?? 0,
    };
  } catch (err) {
    console.warn('[GAS Sync] Startup pull skipped:', err.message);
    return { synced: false, error: err.message };
  }
}

app.post('/api/sync-from-sheet', async (_req, res) => {
  const result = await syncFromGoogleSheet();
  res.json({
    ...result,
    cases: readJson(CASES_FILE, []),
    warrants: readJson(WARRANTS_FILE, []),
    operations: readJson(OPERATIONS_FILE, []),
  });
});

// Serve static frontend in production if built
const DIST_DIR = path.join(__dirname, 'dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
    next();
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================================`);
  console.log(`  TCSD / CIB Case Tracking Server is RUNNING!     `);
  console.log(`  Local URL:   http://localhost:${PORT}           `);
  console.log(`  LAN URL:     http://0.0.0.0:${PORT}             `);
  console.log(`=================================================`);
  syncFromGoogleSheet();
});
