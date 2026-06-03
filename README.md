# AuraTrade — Personal Portfolio Dashboard

A dark-themed personal finance dashboard for tracking your net worth, expenses, and stock holdings — with live sync from **Angel One SmartAPI**.

---

## Features

- **Net Worth Overview** — total wealth broken down into liquid cash, bank balance, and demat funds
- **Wallet Management** — manually add cash or bank deposits; demat balance auto-synced from Angel One
- **Expense Tracker** — log expenses by mode (cash / bank / demat); flag important ones to keep them beyond the 5-month auto-purge
- **Holdings Tracker** — add manual holdings or sync live from your Angel One demat account; track P&L per position
- **Charts** — pie charts for wealth allocation (by asset tag) and wealth split (liquid vs invested)
- **Angel One Sync** — one-click sync pulls live holdings and available cash balance from Angel One SmartAPI via a local proxy server

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v7 |
| Build | Vite 8 |
| Charts | Recharts |
| Icons | Lucide React |
| Backend proxy | Express 5 |
| Angel One auth | TOTP (totp-generator) + JWT |
| HTTP client | Axios |

---

## Getting Started

### 1. Clone & install

```bash
git clone <repo-url>
cd portfolio
npm install
```

### 2. Configure credentials

```bash
cp .env.example .env
```

Open `.env` and fill in your Angel One SmartAPI credentials:

```env
ANGEL_ONE_API_KEY=your_api_key
ANGEL_ONE_CLIENT_CODE=your_client_code
ANGEL_ONE_PIN=your_4_digit_pin
ANGEL_ONE_TOTP_SECRET=your_base32_totp_secret
PORT=5050
```

> **TOTP Secret:** use the base32 secret from your authenticator app setup, **not** the 6-digit OTP code. The server accepts both a raw base32 string and a full `otpauth://` URL.

If you don't have Angel One credentials, you can still use the app — wallet and holdings can be managed manually; the sync button will simply show an error.

### 3. Run

```bash
npm start
```

This starts both the Express proxy (port 5050) and the Vite dev server (port 5173) concurrently. Open [http://localhost:5173](http://localhost:5173).

---

## Project Structure

```
portfolio/
├── server/index.js          # Express proxy for Angel One SmartAPI
├── src/
│   ├── App.jsx              # Root router
│   ├── context/
│   │   └── PortfolioContext.jsx  # Global state + localStorage persistence
│   ├── layouts/
│   │   └── DashboardLayout.jsx  # Sidebar navigation shell
│   ├── pages/
│   │   ├── Dashboard.jsx        # Main dashboard grid
│   │   ├── AllExpenses.jsx      # Full expense history
│   │   └── AllHoldings.jsx      # Full holdings & closed positions
│   └── components/
│       ├── TotalMoney.jsx       # Net worth card
│       ├── Wallet.jsx           # Wallet cards + add funds modal
│       ├── Expenses.jsx         # Expense list + form
│       ├── Holdings.jsx         # Holdings table with actions
│       └── Charts.jsx           # Wealth pie charts
├── .env.example             # Credentials template
└── vite.config.js           # Proxies /api → Express server
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start both frontend and backend |
| `npm run dev` | Vite dev server only (no Angel One sync) |
| `npm run server` | Express proxy only |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | Run ESLint |

---

## Angel One API

The local Express server authenticates with Angel One on every request (TOTP → login → JWT) and proxies two endpoints:

- `GET /api/portfolio` — holdings + RMS (demat cash balance)
- `GET /api/holdings` — holdings only

Your credentials never leave your machine; the proxy runs locally.

---

## Data Persistence

All data is stored in `localStorage` — no database required:

| Key | Contents |
|-----|----------|
| `portfolio_wallet` | Cash, bank, demat balances |
| `portfolio_expenses` | Expense history (auto-purged after 5 months unless flagged) |
| `portfolio_holdings` | Manual + Angel One synced holdings |

---

## License

MIT
