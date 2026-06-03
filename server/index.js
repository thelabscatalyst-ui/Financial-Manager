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

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const { count } = db.prepare('SELECT COUNT(*) as count FROM users').get();
if (count === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  console.log('\n⚠️  Default user created → username: admin | password: admin123');
  console.log('   Change this from Settings after first login.\n');
}

const JWT_SECRET = process.env.JWT_SECRET || 'finance-jwt-secret-change-in-production';

const app = express();
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
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

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('finance_token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
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

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, req.user.id);
  res.json({ ok: true });
});

// ── Angel One helpers ──────────────────────────────────────────────────────────

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
  const credentials = {
    ANGEL_ONE_API_KEY: process.env.ANGEL_ONE_API_KEY?.trim(),
    ANGEL_ONE_CLIENT_CODE: process.env.ANGEL_ONE_CLIENT_CODE?.trim(),
    ANGEL_ONE_PIN: process.env.ANGEL_ONE_PIN?.trim(),
    ANGEL_ONE_TOTP_SECRET: process.env.ANGEL_ONE_TOTP_SECRET?.trim()
  };

  const missingKeys = Object.entries(credentials).filter(([, v]) => !v).map(([k]) => k);
  if (missingKeys.length > 0) {
    const error = new Error('Missing Angel One credentials in .env file.');
    error.statusCode = 400;
    error.details = missingKeys.join(', ');
    throw error;
  }

  const normalizedTotpSecret = normalizeTotpSecret(credentials.ANGEL_ONE_TOTP_SECRET);
  if (!/^[A-Z2-7]+=*$/.test(normalizedTotpSecret)) {
    const error = new Error('Invalid ANGEL_ONE_TOTP_SECRET format.');
    error.statusCode = 400;
    error.details = 'Use the base32 secret from your authenticator setup, not the 6-digit OTP.';
    throw error;
  }

  const { otp: totpToken } = await TOTP.generate(normalizedTotpSecret);
  const loginResponse = await axios.post(
    `${API_BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword`,
    { clientcode: credentials.ANGEL_ONE_CLIENT_CODE, password: credentials.ANGEL_ONE_PIN, totp: totpToken },
    { headers: getBaseHeaders() }
  );

  if (!loginResponse.data.status) {
    const error = new Error('Failed to authenticate with Angel One');
    error.statusCode = 401;
    error.details = loginResponse.data.message || loginResponse.data.errorcode;
    throw error;
  }

  return loginResponse.data.data.jwtToken;
};

const getAuthenticatedHeaders = (jwtToken) => ({ ...getBaseHeaders(), 'Authorization': `Bearer ${jwtToken}` });

// ── Angel One proxy routes (protected) ────────────────────────────────────────

app.get('/api/portfolio', requireAuth, async (req, res) => {
  try {
    const jwtToken = await createAngelSession();
    const [holdingsResponse, rmsResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/rest/secure/angelbroking/portfolio/v1/getHolding`, { headers: getAuthenticatedHeaders(jwtToken) }),
      axios.get(`${API_BASE_URL}/rest/secure/angelbroking/user/v1/getRMS`, { headers: getAuthenticatedHeaders(jwtToken) })
    ]);

    if (!holdingsResponse.data.status) {
      return res.status(500).json({ error: 'Failed to fetch holdings', details: holdingsResponse.data.message });
    }
    if (!rmsResponse.data.status) {
      return res.status(500).json({ error: 'Failed to fetch demat balance', details: rmsResponse.data.message });
    }

    res.json({ message: 'Successfully fetched Angel One portfolio', data: { holdings: holdingsResponse.data.data, rms: rmsResponse.data.data } });
  } catch (error) {
    console.error('Angel One API Error:', error.response?.data || error.message);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Internal Server Error',
      details: error.details || getAngelErrorMessage(error)
    });
  }
});

app.get('/api/holdings', requireAuth, async (req, res) => {
  try {
    const jwtToken = await createAngelSession();
    const holdingsResponse = await axios.get(
      `${API_BASE_URL}/rest/secure/angelbroking/portfolio/v1/getHolding`,
      { headers: getAuthenticatedHeaders(jwtToken) }
    );

    if (!holdingsResponse.data.status) {
      return res.status(500).json({ error: 'Failed to fetch holdings', details: holdingsResponse.data.message });
    }
    res.json({ message: 'Successfully fetched holdings', data: holdingsResponse.data.data });
  } catch (error) {
    console.error('Angel One API Error:', error.response?.data || error.message);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Internal Server Error',
      details: error.details || getAngelErrorMessage(error)
    });
  }
});

// ── Server boot ────────────────────────────────────────────────────────────────

export const startServer = (port = PORT) => app.listen(port, () => {
  console.log(`Finance proxy server running on http://localhost:${port}`);
});

export default app;

let runningServer;
let keepAliveTimer;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runningServer = startServer();
  keepAliveTimer = setInterval(() => {}, 1 << 30);

  const stopServer = () => {
    clearInterval(keepAliveTimer);
    runningServer.close(() => process.exit(0));
  };

  process.once('SIGINT', stopServer);
  process.once('SIGTERM', stopServer);
}
