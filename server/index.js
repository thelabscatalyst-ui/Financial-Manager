import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { TOTP } from 'totp-generator';
import dotenv from 'dotenv';
import { pathToFileURL, fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, '..', 'finance.db'));

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS wallet (
    user_id INTEGER PRIMARY KEY,
    cash REAL DEFAULT 0,
    online_balance REAL DEFAULT 0,
    demat REAL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    mode TEXT NOT NULL,
    important INTEGER DEFAULT 0,
    date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS holdings (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    asset_name TEXT NOT NULL,
    tag TEXT,
    units REAL NOT NULL,
    buy_price REAL NOT NULL,
    current_price REAL NOT NULL,
    profit_and_loss REAL,
    status TEXT DEFAULT 'active',
    date TEXT NOT NULL,
    close_date TEXT,
    is_synced INTEGER DEFAULT 0,
    broker_closed INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    data TEXT DEFAULT '{}',
    timestamp TEXT NOT NULL
  );
`);

// No default user — users register themselves

const JWT_SECRET = process.env.JWT_SECRET || 'finance-jwt-secret-change-in-production';

const app = express();
app.use(cors({ credentials: true, origin: true }));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

const PORT = process.env.PORT || 5050;
const API_BASE_URL = 'https://apiconnect.angelone.in';

const requireAuth = (req, res, next) => {
  const token = req.cookies?.finance_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.clearCookie('finance_token');
    res.status(401).json({ error: 'Session expired. Please log in again.' });
  }
};

// ── Auth routes ────────────────────────────────────────────────────────────────

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });
  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return res.status(400).json({ error: 'Only letters, numbers, and underscores allowed' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  const existing = db.prepare('SELECT id FROM users WHERE LOWER(username) = LOWER(?)').get(username);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  const hash = bcrypt.hashSync(password, 10);
  const { lastInsertRowid: id } = db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username, hash);

  const token = jwt.sign({ id, username }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('finance_token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.status(201).json({ user: { id, username } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('finance_token', token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ user: { id: user.id, username: user.username } });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('finance_token');
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both fields are required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(newPassword, 10), req.user.id);
  res.json({ ok: true });
});

// ── Portfolio data routes ──────────────────────────────────────────────────────

app.get('/api/data', requireAuth, (req, res) => {
  const uid = req.user.id;

  const wallet = db.prepare('SELECT cash, online_balance AS online, demat FROM wallet WHERE user_id = ?').get(uid)
    || { cash: 0, online: 0, demat: 0 };

  const expenses = db.prepare('SELECT * FROM expenses WHERE user_id = ? ORDER BY date DESC').all(uid)
    .map(e => ({ ...e, important: !!e.important }));

  const holdings = db.prepare('SELECT * FROM holdings WHERE user_id = ? ORDER BY date DESC').all(uid)
    .map(h => ({
      id: h.id,
      assetName: h.asset_name,
      tag: h.tag,
      units: h.units,
      buyPrice: h.buy_price,
      currentPrice: h.current_price,
      profitAndLoss: h.profit_and_loss,
      status: h.status,
      date: h.date,
      closeDate: h.close_date,
      isSynced: !!h.is_synced,
      brokerClosed: !!h.broker_closed
    }));

  const auditLog = db.prepare('SELECT * FROM audit_log WHERE user_id = ? ORDER BY timestamp DESC').all(uid)
    .map(e => ({ ...e, data: JSON.parse(e.data || '{}') }));

  res.json({ wallet, expenses, holdings, auditLog });
});

app.post('/api/save', requireAuth, (req, res) => {
  const { wallet, expenses, holdings, auditLog } = req.body;
  const uid = req.user.id;

  // ── Defense in depth: each category is protected INDEPENDENTLY ─────────────
  // An empty/zero incoming payload for any category will NEVER wipe existing
  // real data in that category. The only way to clear data is to add new data
  // that replaces it (i.e. real mutations from the UI).

  const skipped = [];

  const persist = db.transaction(() => {
    // ── Wallet ──────────────────────────────────────────────────────────────
    const incomingWallet = wallet ?? {};
    const incCash   = Number(incomingWallet.cash)   || 0;
    const incOnline = Number(incomingWallet.online) || 0;
    const incDemat  = Number(incomingWallet.demat)  || 0;
    const walletIsZero = incCash === 0 && incOnline === 0 && incDemat === 0;

    const existingWallet = db.prepare(
      'SELECT cash, online_balance, demat FROM wallet WHERE user_id = ?'
    ).get(uid);
    const existingWalletHasMoney = existingWallet &&
      (existingWallet.cash > 0 || existingWallet.online_balance > 0 || existingWallet.demat > 0);

    if (walletIsZero && existingWalletHasMoney) {
      skipped.push('wallet');
    } else {
      db.prepare(`
        INSERT INTO wallet (user_id, cash, online_balance, demat) VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          cash = excluded.cash,
          online_balance = excluded.online_balance,
          demat = excluded.demat
      `).run(uid, incCash, incOnline, incDemat);
    }

    // ── Expenses ────────────────────────────────────────────────────────────
    const incomingExpenses = Array.isArray(expenses) ? expenses : [];
    const existingExpenseCount = db.prepare(
      'SELECT COUNT(*) AS n FROM expenses WHERE user_id = ?'
    ).get(uid).n;

    if (incomingExpenses.length === 0 && existingExpenseCount > 0) {
      skipped.push('expenses');
    } else {
      db.prepare('DELETE FROM expenses WHERE user_id = ?').run(uid);
      const insertExp = db.prepare('INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const e of incomingExpenses) {
        insertExp.run(e.id, uid, e.description, e.amount, e.mode, e.important ? 1 : 0, e.date);
      }
    }

    // ── Holdings ────────────────────────────────────────────────────────────
    const incomingHoldings = Array.isArray(holdings) ? holdings : [];
    const existingHoldingCount = db.prepare(
      'SELECT COUNT(*) AS n FROM holdings WHERE user_id = ?'
    ).get(uid).n;

    if (incomingHoldings.length === 0 && existingHoldingCount > 0) {
      skipped.push('holdings');
    } else {
      db.prepare('DELETE FROM holdings WHERE user_id = ?').run(uid);
      const insertH = db.prepare(
        'INSERT INTO holdings VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      );
      for (const h of incomingHoldings) {
        insertH.run(
          h.id, uid, h.assetName, h.tag ?? 'Other',
          h.units, h.buyPrice, h.currentPrice,
          h.profitAndLoss ?? null, h.status, h.date,
          h.closeDate ?? null, h.isSynced ? 1 : 0, h.brokerClosed ? 1 : 0
        );
      }
    }

    // ── Audit log ───────────────────────────────────────────────────────────
    const incomingAudit = Array.isArray(auditLog) ? auditLog : [];
    const existingAuditCount = db.prepare(
      'SELECT COUNT(*) AS n FROM audit_log WHERE user_id = ?'
    ).get(uid).n;

    if (incomingAudit.length === 0 && existingAuditCount > 0) {
      skipped.push('audit_log');
    } else {
      db.prepare('DELETE FROM audit_log WHERE user_id = ?').run(uid);
      const insertA = db.prepare('INSERT INTO audit_log VALUES (?, ?, ?, ?, ?, ?)');
      for (const e of incomingAudit) {
        insertA.run(e.id, uid, e.type, e.description, JSON.stringify(e.data || {}), e.timestamp);
      }
    }
  });

  persist();

  if (skipped.length > 0) {
    console.warn(`[SAVE PARTIAL] User ${uid}: skipped empty categories ${skipped.join(', ')}`);
  }

  res.json({ ok: true, skipped });
});

// ── Angel One proxy ────────────────────────────────────────────────────────────

const getBaseHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-UserType': 'USER',
  'X-SourceID': 'WEB',
  'X-ClientLocalIP': '192.168.168.168',
  'X-ClientPublicIP': '106.193.147.98',
  'X-MACAddress': '98-1c-b3-09-85-fd',
  'X-PrivateKey': process.env.ANGEL_ONE_API_KEY
});

const getAngelErrorMessage = (error) => {
  const data = error.response?.data;
  if (!data) return error.message;
  return data.message || data.error || JSON.stringify(data);
};

const normalizeTotpSecret = (secret) => {
  const trimmed = secret.trim().replace(/^['"]|['"]$/g, '');
  if (trimmed.toLowerCase().startsWith('otpauth://')) {
    const otpUrl = new URL(trimmed);
    return otpUrl.searchParams.get('secret')?.replace(/\s+/g, '').toUpperCase() || '';
  }
  return trimmed.replace(/\s+/g, '').toUpperCase();
};

const createAngelSession = async () => {
  const creds = {
    ANGEL_ONE_API_KEY: process.env.ANGEL_ONE_API_KEY?.trim(),
    ANGEL_ONE_CLIENT_CODE: process.env.ANGEL_ONE_CLIENT_CODE?.trim(),
    ANGEL_ONE_PIN: process.env.ANGEL_ONE_PIN?.trim(),
    ANGEL_ONE_TOTP_SECRET: process.env.ANGEL_ONE_TOTP_SECRET?.trim()
  };
  const missing = Object.entries(creds).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    const err = new Error('Missing Angel One credentials in .env file.');
    err.statusCode = 400; err.details = missing.join(', ');
    throw err;
  }

  const secret = normalizeTotpSecret(creds.ANGEL_ONE_TOTP_SECRET);
  if (!/^[A-Z2-7]+=*$/.test(secret)) {
    const err = new Error('Invalid ANGEL_ONE_TOTP_SECRET format.');
    err.statusCode = 400;
    err.details = 'Use the base32 secret from your authenticator setup.';
    throw err;
  }

  const { otp } = await TOTP.generate(secret);
  const login = await axios.post(
    `${API_BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword`,
    { clientcode: creds.ANGEL_ONE_CLIENT_CODE, password: creds.ANGEL_ONE_PIN, totp: otp },
    { headers: getBaseHeaders() }
  );
  if (!login.data.status) {
    const err = new Error('Failed to authenticate with Angel One');
    err.statusCode = 401; err.details = login.data.message || login.data.errorcode;
    throw err;
  }
  return login.data.data.jwtToken;
};

const authedHeaders = (jwt) => ({ ...getBaseHeaders(), Authorization: `Bearer ${jwt}` });

app.get('/api/portfolio', requireAuth, async (req, res) => {
  try {
    const token = await createAngelSession();
    const [h, r] = await Promise.all([
      axios.get(`${API_BASE_URL}/rest/secure/angelbroking/portfolio/v1/getHolding`, { headers: authedHeaders(token) }),
      axios.get(`${API_BASE_URL}/rest/secure/angelbroking/user/v1/getRMS`, { headers: authedHeaders(token) })
    ]);
    if (!h.data.status) return res.status(500).json({ error: 'Failed to fetch holdings', details: h.data.message });
    if (!r.data.status) return res.status(500).json({ error: 'Failed to fetch RMS', details: r.data.message });
    res.json({ message: 'OK', data: { holdings: h.data.data, rms: r.data.data } });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Internal Server Error',
      details: error.details || getAngelErrorMessage(error)
    });
  }
});

// ── Boot ──────────────────────────────────────────────────────────────────────

export const startServer = (port = PORT) => app.listen(port, () => {
  console.log(`Finance server running on http://localhost:${port}`);
});

export default app;

let keepAliveTimer;
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
  keepAliveTimer = setInterval(() => {}, 1 << 30);
  const stop = () => { clearInterval(keepAliveTimer); process.exit(0); };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
