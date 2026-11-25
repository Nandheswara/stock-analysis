# Equity Labs

A modern, dual-purpose web workspace for **Indian Stock Fundamental Analysis** and **Personal Finance Tracking**. Powered by **Firebase** for cloud storage, real-time sync, and multi-device access.

## 🚀 Key Modules

### 1. Finance Tracker & Net Worth Dashboard 💰
A comprehensive ledger to track your net worth month-over-month.
- 📈 **Net Worth Tracking**: Automatically calculates your total net worth (Assets - Liabilities).
- 🏦 **Asset Management**: Track Cash, Bank Accounts, Stock Portfolios, EPFO, and PPF balances.
- 💳 **Liability Management**: Manage Credit Cards, Personal Loans (with automated EMI amortization schedules), and General Expenses.
- 🛡️ **Insurance Tracking**: Manage Health, Term, and Corporate insurance policies and premiums.
- 📅 **Month-to-Month Rollover**: Copy ongoing obligations and balances from previous months to the current month to easily maintain your ledger.
- 📊 **Visual Summaries**: Beautifully organized dashboard separating assets, liabilities, and monthly cash flow.

### 2. AI Credit Card Hub & Advisor 🤖✨ (NEW)
A unified AI-powered credit card intelligence center integrated into the Finance Tracker. Accessible via the **"AI Hub"** button on the Credit Cards section.

#### 4 Smart Tabs Inside the Hub:

| Tab | What it does |
|---|---|
| **💡 Spend Advisor** | Natural language spend queries (e.g., "₹3,000 on Amazon") — ranks your cards by real cashback/rewards and suggests the optimal split for high-value purchases using CIBIL-safe multi-card logic |
| **📊 Monthly Audit** | Stacked bar + trend-line chart of monthly cashback earned per card; AI-generated retrospective review of your spend patterns |
| **🏷️ Fee Waivers** | Per-card annual fee waiver progress bars showing how close you are to the milestone spend threshold |
| **🔍 Portfolio Review** | AI diagnostic of your card portfolio — strengths, blindspots, and personalized upgrade/new card recommendations |

#### Architecture

```
Browser (Finance Tracker)
        │
        ▼
  NVIDIA NIM API (via Cloudflare Worker CORS Proxy)
        │  Model: nvidia/nemotron-3.5-lightning-30b-a3b
        │  enable_thinking: false  (sub-2s responses)
        ▼
  Cloudflare Worker
  https://equity-card-ai.nandheswara21.workers.dev/
```

> **Why a Cloudflare Worker?** Direct browser calls to `integrate.api.nvidia.com` return HTTP 403 (CORS blocked). The Worker acts as a transparent relay, adding the Authorization header server-side so the browser never exposes the API key.

#### New Files Added

```
stock-analysis/
├── cloudflare-worker/
│   └── worker.js                        # Cloudflare CORS proxy for NVIDIA NIM
├── css/
│   └── credit-card-ai-advisor.css       # All styles for the unified AI Hub modal
└── js/
    ├── credit-card-ai-advisor.js         # Unified AI Hub controller (4 tabs)
    └── services/
        └── nvidia-ai-service.js          # NVIDIA NIM API client
```

#### Modified Files

| File | Change |
|---|---|
| `pages/finance-tracker.html` | Unified AI Hub modal (4 tabs), Monthly Cashback Trend chart canvas in Analytics, `cardMonthlyCashback` input in Edit Card form |
| `pages/admin.html` | "Enable AI Credit Card Advisor & Hub" toggle in System Settings |
| `js/finance-tracker.js` | Cashback chart render call, `saveCardMonthlyCashback` bridge |
| `js/firebase-finance-service.js` | Exported `saveCardMonthlyCashback` from liabilities service |
| `js/services/finance/liabilities.js` | `cashbacks` field in `updateCreditCard`, `saveCardMonthlyCashback` export |
| `js/admin.js` | `enableCardAIAdvisor` save/load in system settings form |
| `js/global.js` | `window.getSystemSettings`, `window.isFeatureEnabled`, `systemSettingsLoaded` event, AI Advisor sub-feature toggle |
| `js/cors-proxy.js` | Converted to ES module imports (ESM) |

#### Monthly Cashback Chart

The **Monthly Cashback Earned** chart appears in two places:
1. **Analytics section** of the Finance Tracker main page (canvas: `monthlyCashbackChart`)
2. **Monthly Audit tab** inside the AI Hub (canvas: `aiMonthlyCashbackChart`)

**How cashback is calculated:**
- If you have entered a real cashback figure via **Edit Card → "Actual Cashback Received this Month (₹)"**, that exact value is used and labelled *"Real Verified"*.
- Otherwise, an estimated value is computed using blended effective reward rates per card:

| Card | Blended Effective Rate |
|---|---|
| Amazon Pay ICICI | 1.66% |
| HSBC Live Plus | 2.5% |
| HDFC Millennia | 1.5% |
| Kiwi | 1.0% |

> **Why blended rates?** Statement balance ≠ rewarded spend. Example: Amazon Pay ICICI June 2026 balance of ₹31,951 → real cashback ₹530 ≈ 1.66% (not the advertised 3.5%, because only eligible Amazon purchases earn 5%).

**To enter real cashback:** Open **Edit Card** for any credit card → scroll to "Actual Cashback Received this Month (₹)" → save. This is stored in Firebase at `users/{uid}/finance/creditCards/{cardId}/cashbacks/{YYYY-MM}`.

#### Admin Toggle (Enable / Disable)

- **Setting key**: `enableCardAIAdvisor` in Firebase `systemSettings`
- **Admin page path**: System Settings → "Enable AI Credit Card Advisor & Hub"
- When **disabled**: The AI Hub button is hidden on the Finance Tracker page. Any direct call to open the modal shows a toast notification instead.
- When **enabled**: Full AI Hub is accessible to all authenticated users.

---

### 3. Stock Analysis Terminal 📈
Analyze Indian stocks side-by-side using fundamental metrics.
- 🌐 **Dual Data Sources**: Fetch fundamental metrics simultaneously from Groww.in and Yahoo Finance.
- 🎯 **13 Key Fundamental Metrics**: Including ROA, EBITDA, P/S YoY, ROE, P/E, Debt-Equity, and more.
- 📊 **Beta Value Crawling**: Automatically fetch BETA (5Y Monthly) from Yahoo Finance to understand stock volatility.
- 🗺️ **Symbol Mapping**: Automatic mapping from Indian stock names to Yahoo Finance `.NS` symbols.
- 📝 **Manual & Auto Data**: Fetch automatically or enter manually for complete control.

---

## 🔥 Firebase Integration

- ☁️ **Cloud Storage**: All data stored securely in Firebase Realtime Database.
- 🔄 **Real-time Sync**: Changes sync instantly across all devices.
- 👤 **User Authentication**: Secure Login with Email/Password + Google Sign-In.
- 💾 **Automatic Backup**: Never lose your financial data.
- 📡 **Offline Support**: Works seamlessly without internet, syncing changes when you come back online.

---

## 💻 Technologies Used

- **Frontend**: HTML5, Vanilla CSS, JavaScript (ES6+), Bootstrap 5, Bootstrap Icons, jQuery, Chart.js
- **Backend (BaaS)**: Firebase SDK 11.1.0 (Auth, Realtime Database, Analytics)
- **AI**: NVIDIA NIM — `nvidia/nemotron-3.5-lightning-30b-a3b` (via Cloudflare Worker CORS proxy)
- **Edge Proxy**: Cloudflare Workers (deployed at `https://equity-card-ai.nandheswara21.workers.dev/`)
- **Data Integration**: Node.js CORS Proxy (local dev), Cloudflare Worker (production)

---

## 🚀 How to Run Locally

### ⚠️ Prerequisites: Local CORS Proxy

To fetch live stock data from external APIs (Groww, Yahoo Finance), you **MUST** run the local CORS proxy server.

```bash
# Run the proxy using Node.js
node js/cors-proxy.js
```
*Keep this terminal window running in the background while using the application.*

> The AI Credit Card Hub does **not** require this local proxy. It routes through the Cloudflare Worker in both local and production environments.

### Starting the Web App

1. Clone or download this repository.
2. Start a local web server from the project root:

   **Recommended — Threaded Python server** (no `ERR_CONNECTION_RESET` on hard reload):
   ```bash
   python3 serve.py
   ```

   **Alternative — npx serve** (Node.js, zero install):
   ```bash
   npx serve -l 8000
   ```

   > ⚠️ **Do NOT use** `python3 -m http.server` — it is single-threaded and will drop connections when the browser fires many parallel requests (e.g., on empty cache + hard reload), causing `ERR_CONNECTION_RESET`.

3. Open `http://localhost:8000/index.html` in your browser.

> ⚠️ **Note:** Do not open the HTML files directly using the `file://` protocol, as this will block Firebase Authentication and Database operations. Always use a local HTTP server.

## 🧪 End-to-End Test Automation (Playwright)

The project includes an enterprise-grade, 100% free Playwright automated test suite configured with Page Object Models (POM) and GitHub Actions CI.

### Running Tests Locally

```bash
# Run all end-to-end test suites headlessly
npm test

# Run tests in interactive UI mode
npm run test:ui

# View generated HTML test execution report
npm run test:report

# Run specific suite (e.g. smoke & navigation)
npm run test:smoke
```

### GitHub Actions CI/CD Pipeline
Tests automatically execute on every push and pull request via [`.github/workflows/e2e-tests.yml`](.github/workflows/e2e-tests.yml), caching browsers and dependencies for lightning-fast sub-2-minute execution.
---

## 📁 File Structure

```
stock-analysis/
├── index.html                              # App entry point / Home page
├── pages/
│   ├── analysis.html                       # Stock Analysis Terminal
│   ├── finance-tracker.html                # Finance Tracker Dashboard + AI Hub
│   └── admin.html                          # Admin panel (feature toggles, settings)
├── css/
│   ├── global.css                          # Global design system
│   ├── home.css                            # Home page specific styles
│   ├── analysis.css                        # Stock analysis styles
│   ├── finance-tracker.css                 # Finance tracker styles
│   └── credit-card-ai-advisor.css          # AI Credit Card Hub & Advisor styles
├── js/
│   ├── global.js                           # Shared logic, feature flags, UI handlers
│   ├── analysis.js                         # Stock analysis controller
│   ├── finance-tracker.js                  # Finance tracker controller
│   ├── credit-card-ai-advisor.js           # AI Hub unified controller (4 tabs)
│   ├── admin.js                            # Admin panel controller
│   ├── fetch.js                            # API integration (Groww/Yahoo)
│   ├── cors-proxy.js                       # Local proxy for stock data fetching (ESM)
│   ├── firebase-auth-service.js            # Firebase authentication logic
│   ├── firebase-finance-service.js         # Finance Realtime Database logic
│   └── services/
│       ├── nvidia-ai-service.js            # NVIDIA NIM API client
│       └── finance/
│           └── liabilities.js              # Credit card & loan EMI logic + cashback store
├── cloudflare-worker/
│   └── worker.js                           # Cloudflare CORS proxy for NVIDIA NIM
└── resource/
    └── yahoo-symbols.json                  # Yahoo Finance symbol mappings
```

---

## 🔒 Security & Privacy

This application is built with security in mind:
- **Firebase Auth** guarantees that you can only read and write your own data.
- **Strict Database Rules** isolate each user's node under `users/{userId}/...`
- All data entered in the Finance Tracker is strictly tied to your authenticated Firebase UID.
- **API keys** for NVIDIA NIM are stored server-side in the Cloudflare Worker environment — never exposed to the browser.

---

**Made with ❤️ for Personal Finance and Stock Market Enthusiasts**
