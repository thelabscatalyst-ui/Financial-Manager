# CLAUDE.md — AuraTrade Portfolio Dashboard

## Project Overview
AuraTrade is a personal finance dashboard built with React 19 + Vite. It tracks liquid cash, bank balances, stock holdings, and expenses. It optionally syncs live portfolio data from **Angel One SmartAPI** via a local Express proxy server.

## Architecture

```
portfolio/
├── server/
│   └── index.js          # Express proxy — authenticates with Angel One and exposes /api/portfolio, /api/holdings
├── src/
│   ├── App.jsx            # Root router: /, /expenses, /holdings
│   ├── context/
│   │   └── PortfolioContext.jsx  # Single global state: wallet, expenses, holdings, sync logic
│   ├── layouts/
│   │   └── DashboardLayout.jsx  # Sidebar + <Outlet> shell
│   ├── pages/
│   │   ├── Dashboard.jsx        # 12-col grid composing all widgets
│   │   ├── AllExpenses.jsx      # Full expense history
│   │   └── AllHoldings.jsx      # Full holdings + closed positions
│   └── components/
│       ├── TotalMoney.jsx       # Net worth card
│       ├── Wallet.jsx           # Cash / Bank / Demat cards + Add Cash modal
│       ├── Expenses.jsx         # Expense list + Add Expense form
│       ├── Holdings.jsx         # Holdings table with actions
│       └── Charts.jsx           # Recharts pie charts (Wealth Allocation, Wealth Split)
├── .env                   # ⚠️ Never commit — holds Angel One secrets
├── .env.example           # Template for required env vars
└── vite.config.js         # Vite dev server proxies /api → http://localhost:5050
```

## State Management
All state lives in `PortfolioContext` (`src/context/PortfolioContext.jsx`) and persists to `localStorage` under three keys:
- `portfolio_wallet` — `{ cash, online, demat }`
- `portfolio_expenses` — array; auto-purged after 5 months (unless flagged `important: true`)
- `portfolio_holdings` — array; `isSynced: true` marks Angel One holdings

Holdings have a `status` field (`active` | `closed`). Synced holdings (from Angel One) cannot be manually closed.

## API / Backend
The Express server (`server/index.js`) runs on **port 5050** and Vite dev server proxies `/api/*` to it.

Two endpoints:
- `GET /api/portfolio` — returns `{ holdings, rms }` (RMS gives the demat cash balance)
- `GET /api/holdings` — returns holdings only

Authentication flow per request: generate TOTP → POST login → get JWT → attach JWT to data requests.

## Environment Variables
Required in `.env` (copy from `.env.example`):
```
ANGEL_ONE_API_KEY=
ANGEL_ONE_CLIENT_CODE=
ANGEL_ONE_PIN=
ANGEL_ONE_TOTP_SECRET=   # base32 secret (NOT the 6-digit OTP)
PORT=5050
```

`ANGEL_ONE_TOTP_SECRET` must be the raw base32 secret from your authenticator setup, not an otpauth:// URL (though the server can parse both).

## Dev Commands
```bash
npm start        # runs Express server + Vite dev server concurrently
npm run server   # Express proxy only (port 5050)
npm run dev      # Vite only (port 5173, no Angel One sync)
npm run build    # production build → dist/
npm run lint     # ESLint
```

## Key Conventions
- No TypeScript — plain JSX throughout.
- Styling uses CSS variables defined in `src/index.css` (`--accent-primary`, `--panel-border`, `--text-secondary`, etc.) plus utility classes (`panel`, `btn btn-primary`, `flex`, `text-sm`, etc.).
- Inline styles are used extensively for layout; utility class names for typography/colour.
- `parseMoney()` in context handles `undefined`/`null`/non-numeric API values — always use it when reading Angel One response fields.
- Holdings added via the UI have `isSynced: false`; Angel One synced holdings have `isSynced: true`. Never call `closeHolding()` on synced holdings (guarded in context).

## What NOT to do
- Do not commit `.env`.
- Do not run `npm run build` to test UI changes — use `npm start` and view in the browser.
- The `dist/` directory is gitignored; do not commit it.
- `AuraTrade-SourceCode.zip` is a build artifact — do not reference it in code.
