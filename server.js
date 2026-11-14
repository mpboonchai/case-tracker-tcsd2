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
} from './server-gsheet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// Ensure database directory exists
const DB_DIR = path.join(__dirname, 'database');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const CASES_FILE = path.join(DB_DIR, 'cases.json');
const USERS_FILE = path.join(DB_DIR, 'users.json');
const PERSONNEL_FILE = path.join(DB_DIR, 'personnel.json');
const WARRANTS_FILE = path.join(DB_DIR, 'warrants.json');

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

// GET all cases
app.get('/api/cases', (req, res) => {
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
  cases.unshift(newCase);
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
    res.json({ success: true, count: cases.length, googleSheetSynced: gas.synced });
  } else {
    res.status(400).json({ error: 'Invalid data format' });
  }
});

// Shared CRUD registration for Personnel & Warrants
const registerCollectionRoutes = (routeName, filePath, idPrefix) => {
  app.get(`/api/${routeName}`, (_req, res) => {
    res.json(readJson(filePath, []));
  });

  app.post(`/api/${routeName}`, (req, res) => {
    const item = req.body;
    if (!item.id) item.id = `${idPrefix}-${Date.now()}`;
    const list = readJson(filePath, []);
    list.unshift(item);
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
      items = await offloadImagesToDrive(items);
    }
    writeJson(filePath, items);
    const personnel = readJson(PERSONNEL_FILE, []);
    const gas = await pushCollectionToGas(routeName, items, personnel);
    res.json({ success: true, count: items.length, googleSheetSynced: gas.synced });
  });
};

registerCollectionRoutes('personnel', PERSONNEL_FILE, 'per');
registerCollectionRoutes('warrants', WARRANTS_FILE, 'war');

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
    const { buffer, fileName, mimeType } = await generateDocumentBuffer(type, warrant, personnel);
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
});
