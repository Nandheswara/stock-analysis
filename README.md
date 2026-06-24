# Equity Labs

A modern, dual-purpose web workspace for **Indian Stock Fundamental Analysis** and **Personal Finance Tracking**. Powered by **Firebase** for cloud storage, real-time sync, and multi-device access.

## 🚀 Key Modules

### 1. Finance Tracker & Net Worth Dashboard 💰 (NEW)
A comprehensive ledger to track your net worth month-over-month.
- 📈 **Net Worth Tracking**: Automatically calculates your total net worth (Assets - Liabilities).
- 🏦 **Asset Management**: Track Cash, Bank Accounts, Stock Portfolios, EPFO, and PPF balances.
- 💳 **Liability Management**: Manage Credit Cards, Personal Loans (with automated EMI amortization schedules), and General Expenses.
- 🛡️ **Insurance Tracking**: Manage Health, Term, and Corporate insurance policies and premiums.
- 📅 **Month-to-Month Rollover**: Copy ongoing obligations and balances from previous months to the current month to easily maintain your ledger.
- 📊 **Visual Summaries**: Beautifully organized dashboard separating assets, liabilities, and monthly cash flow.

### 2. Stock Analysis Terminal 📈
Analyze Indian stocks side-by-side using fundamental metrics.
- 🌐 **Dual Data Sources**: Fetch fundamental metrics simultaneously from Groww.in and Yahoo Finance.
- 🎯 **13 Key Fundamental Metrics**: Including ROA, EBITDA, P/S YoY, ROE, P/E, Debt-Equity, and more.
- 📊 **Beta Value Crawling**: Automatically fetch BETA (5Y Monthly) from Yahoo Finance to understand stock volatility.
- 🗺️ **Symbol Mapping**: Automatic mapping from Indian stock names to Yahoo Finance `.NS` symbols.
- 📝 **Manual & Auto Data**: Fetch automatically or enter manually for complete control.

## 🔥 Firebase Integration

- ☁️ **Cloud Storage**: All data stored securely in Firebase Realtime Database.
- 🔄 **Real-time Sync**: Changes sync instantly across all devices.
- 👤 **User Authentication**: Secure Login with Email/Password + Google Sign-In.
- 💾 **Automatic Backup**: Never lose your financial data.
- 📡 **Offline Support**: Works seamlessly without internet, syncing changes when you come back online.

## 💻 Technologies Used

- **Frontend**: HTML5, Vanilla CSS, JavaScript (ES6+), Bootstrap 5, Bootstrap Icons, jQuery
- **Backend (BaaS)**: Firebase SDK 11.1.0 (Auth, Realtime Database, Analytics)
- **Data Integration**: Node.js CORS Proxy

## 🚀 How to Run Locally

### ⚠️ Prerequisites: Local CORS Proxy

To fetch live stock data from external APIs (Groww, Yahoo Finance), you **MUST** run the local CORS proxy server.

```bash
# Run the proxy using Node.js
node js/cors-proxy.js
```
*Keep this terminal window running in the background while using the application.*

### Starting the Web App

1. Clone or download this repository.
2. Start a local web server from the project root:
   ```bash
   python3 -m http.server 8000
   ```
3. Open `http://localhost:8000/index.html` in your browser.

> ⚠️ **Note:** Do not open the HTML files directly using the `file://` protocol, as this will block Firebase Authentication and Database operations. Always use a local HTTP server.

## 📁 File Structure

```
stock-analysis/
├── index.html                          # App entry point / Home page
├── pages/
│   ├── analysis.html                   # Stock Analysis Terminal
│   └── finance-tracker.html            # Finance Tracker Dashboard
├── css/
│   ├── global.css                      # Global design system
│   ├── home.css                        # Home page specific styles
│   ├── analysis.css                    # Stock analysis styles
│   └── finance-tracker.css             # Finance tracker styles
├── js/
│   ├── global.js                       # Shared logic and UI handlers
│   ├── analysis.js                     # Stock analysis controller
│   ├── finance-tracker.js              # Finance tracker controller
│   ├── fetch.js                        # API integration (Groww/Yahoo)
│   ├── firebase-auth-service.js        # Firebase authentication logic
│   └── firebase-finance-service.js     # Finance Realtime Database logic
├── services/finance/                   # Dedicated modular finance services
│   └── liabilities.js                  # Loan EMI amortization logic
├── resource/
│   └── yahoo-symbols.json              # Yahoo Finance mappings
└── cors-proxy.js                       # Local proxy for API fetching
```

## 🔒 Security & Privacy

This application is built with security in mind:
- **Firebase Auth** guarantees that you can only read and write your own data.
- **Strict Database Rules** isolate each user's node under `users/{userId}/...`.
- All data entered in the Finance Tracker is strictly tied to your authenticated Firebase UID.

---

**Made with ❤️ for Personal Finance and Stock Market Enthusiasts**
