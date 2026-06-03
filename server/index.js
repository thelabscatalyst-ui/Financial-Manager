import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { TOTP } from 'totp-generator';
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const API_BASE_URL = 'https://apiconnect.angelone.in';

// Generic headers required by Angel One
const getBaseHeaders = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'X-UserType': 'USER',
  'X-SourceID': 'WEB',
  'X-ClientLocalIP': '192.168.168.168', // Dummy IP as per docs
  'X-ClientPublicIP': '106.193.147.98', // Dummy IP as per docs
  'X-MACAddress': '98-1c-b3-09-85-fd', // Dummy MAC as per docs
  'X-PrivateKey': process.env.ANGEL_ONE_API_KEY
});

const getAngelErrorMessage = (error) => {
  const data = error.response?.data;

  if (!data) {
    return error.message;
  }

  return data.message || data.error || JSON.stringify(data);
};

const normalizeTotpSecret = (secret) => {
  const trimmedSecret = secret.trim().replace(/^['"]|['"]$/g, '');

  if (trimmedSecret.toLowerCase().startsWith('otpauth://')) {
    const otpUrl = new URL(trimmedSecret);
    return otpUrl.searchParams.get('secret')?.replace(/\s+/g, '').toUpperCase() || '';
  }

  return trimmedSecret.replace(/\s+/g, '').toUpperCase();
};

const createAngelSession = async () => {
  const credentials = {
    ANGEL_ONE_API_KEY: process.env.ANGEL_ONE_API_KEY?.trim(),
    ANGEL_ONE_CLIENT_CODE: process.env.ANGEL_ONE_CLIENT_CODE?.trim(),
    ANGEL_ONE_PIN: process.env.ANGEL_ONE_PIN?.trim(),
    ANGEL_ONE_TOTP_SECRET: process.env.ANGEL_ONE_TOTP_SECRET?.trim()
  };
  const {
    ANGEL_ONE_CLIENT_CODE,
    ANGEL_ONE_PIN,
    ANGEL_ONE_TOTP_SECRET
  } = credentials;
  const missingKeys = Object.entries(credentials)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    const error = new Error('Missing Angel One credentials in .env file.');
    error.statusCode = 400;
    error.details = missingKeys.join(', ');
    throw error;
  }

  const normalizedTotpSecret = normalizeTotpSecret(ANGEL_ONE_TOTP_SECRET);

  if (!/^[A-Z2-7]+=*$/.test(normalizedTotpSecret)) {
    const error = new Error('Invalid ANGEL_ONE_TOTP_SECRET format.');
    error.statusCode = 400;
    error.details = 'Use the base32 secret from Angel One/Authenticator setup, not the 6-digit OTP code. If you copied an otpauth URL, keep the secret query value only.';
    throw error;
  }

  const { otp: totpToken } = await TOTP.generate(normalizedTotpSecret);

  const loginResponse = await axios.post(`${API_BASE_URL}/rest/auth/angelbroking/user/v1/loginByPassword`, {
    clientcode: ANGEL_ONE_CLIENT_CODE,
    password: ANGEL_ONE_PIN,
    totp: totpToken
  }, {
    headers: getBaseHeaders()
  });

  if (!loginResponse.data.status) {
    const error = new Error('Failed to authenticate with Angel One');
    error.statusCode = 401;
    error.details = loginResponse.data.message || loginResponse.data.errorcode;
    throw error;
  }

  return loginResponse.data.data.jwtToken;
};

const getAuthenticatedHeaders = (jwtToken) => ({
  ...getBaseHeaders(),
  'Authorization': `Bearer ${jwtToken}`
});

app.get('/api/portfolio', async (req, res) => {
  try {
    const jwtToken = await createAngelSession();

    const [holdingsResponse, rmsResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/rest/secure/angelbroking/portfolio/v1/getHolding`, {
        headers: getAuthenticatedHeaders(jwtToken)
      }),
      axios.get(`${API_BASE_URL}/rest/secure/angelbroking/user/v1/getRMS`, {
        headers: getAuthenticatedHeaders(jwtToken)
      })
    ]);

    if (!holdingsResponse.data.status) {
      return res.status(500).json({
        error: 'Failed to fetch holdings',
        details: holdingsResponse.data.message || holdingsResponse.data.errorcode
      });
    }

    if (!rmsResponse.data.status) {
      return res.status(500).json({
        error: 'Failed to fetch demat balance',
        details: rmsResponse.data.message || rmsResponse.data.errorcode
      });
    }

    res.json({
      message: 'Successfully fetched Angel One portfolio',
      data: {
        holdings: holdingsResponse.data.data,
        rms: rmsResponse.data.data
      }
    });
  } catch (error) {
    console.error('Angel One API Error:', error.response?.data || error.message);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Internal Server Error while communicating with Angel One',
      details: error.details || getAngelErrorMessage(error)
    });
  }
});

// Endpoint to fetch holdings
app.get('/api/holdings', async (req, res) => {
  try {
    const jwtToken = await createAngelSession();

    // 3. Fetch Holdings
    const holdingsResponse = await axios.get(`${API_BASE_URL}/rest/secure/angelbroking/portfolio/v1/getHolding`, {
      headers: getAuthenticatedHeaders(jwtToken)
    });

    if (!holdingsResponse.data.status) {
      return res.status(500).json({
        error: 'Failed to fetch holdings',
        details: holdingsResponse.data.message || holdingsResponse.data.errorcode
      });
    }

    // 4. Return holdings data
    res.json({
      message: 'Successfully fetched holdings',
      data: holdingsResponse.data.data
    });

  } catch (error) {
    console.error('Angel One API Error:', error.response?.data || error.message);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Internal Server Error while communicating with Angel One',
      details: error.details || getAngelErrorMessage(error)
    });
  }
});

export const startServer = (port = PORT) => app.listen(port, () => {
  console.log(`Angel One Proxy Server running on http://localhost:${port}`);
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
