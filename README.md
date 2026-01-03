# Stock Analysis Dashboard

A modern web application for analyzing Indian stocks with fundamental metrics. Now with **Firebase integration** for cloud storage, real-time sync, and multi-device access!

## 🚀 Latest Updates

### 🌐 Dual Data Source Integration (Groww + Yahoo Finance) ✅ NEW
- 📊 **Yahoo Finance Integration**: Fetch ROA, EBITDA, P/S YoY, and BETA from Yahoo Finance
- 🔄 **Parallel Fetching**: Fetch from both Groww and Yahoo Finance simultaneously
- 🎯 **Comprehensive Metrics**: Get the best of both sources automatically
- 📈 **Enhanced Accuracy**: Cross-reference data from multiple reliable sources
- 🗺️ **Symbol Mapping**: Automatic mapping from stock names to Yahoo Finance symbols

### 🔥 Firebase Integration ✅ COMPLETE
- ☁️ **Cloud Storage**: All data stored in Firebase Realtime Database
- 🔄 **Real-time Sync**: Changes sync instantly across all devices
- 👤 **User Authentication**: Email/Password + Google Sign-In
- 📱 **Multi-device Support**: Access your stocks from anywhere
- 💾 **Automatic Backup**: Never lose your data
- 📡 **Offline Support**: Works without internet, syncs when online

## Features

-  **Stock Analysis**: Add and analyze multiple stocks side-by-side
- 📝 **Manual Data Entry**: Enter fundamental metrics for each stock
- ☁️ **Cloud Storage**: Data synced across all devices with Firebase
- 👤 **User Authentication**: Secure login with Email/Password or Google
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎨 **Modern UI**: Clean and intuitive interface built with Bootstrap 5
- 🔒 **Secure**: User authentication and data isolation
- 📡 **Offline Support**: Works offline, syncs automatically when online

## 13 Key Fundamental Metrics

1. Liquidity (Cash More than Debt)
2. Quick Ratio (In-Hand Cash)
3. Leverage (Debt Equity Ratio)
4. Profitability (ROE)
6. Return on Asset (ROA)
7. EBITDA (Latest & Previous FY)
8. Dividend Yield
9. P/E Ratio (Stock & Industry)
10. Price to Book Ratio (P/B)
11. Price to Sales (P/S) YoY
12. BETA
13. Promoter Holdings

## Technologies Used

- **HTML5**: Semantic markup
- **CSS3**: Custom styles with Bootstrap 5
- **JavaScript ES6+**: Modern JavaScript with modules
- **Bootstrap 5**: UI framework
- **Bootstrap Icons**: Icon library
- **jQuery**: DOM manipulation and AJAX
- **Firebase SDK 11.1.0**: Backend services
  - Firebase Realtime Database
  - Firebase Authentication
  - Firebase Analytics

## How to Use

### Local Development

1. Clone or download this folder
2. Open `index.html` in your web browser
3. No server required - runs entirely in the browser!

### GitHub Pages Deployment

1. **Create a GitHub repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to your repository settings
   - Navigate to "Pages" section
   - Under "Source", select "main" branch
   - Select root folder or `/docs` folder (if you moved files there)
   - Click "Save"

3. **Access Your Site**
   - Your site will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`
   - Wait a few minutes for the initial deployment

### Using the Application

1. **Home Page**: Overview of features and getting started guide
2. **Analysis Page**: 
   - Sign up or login with email/password or Google
   - Add stocks by entering Symbol and Company Name
   - Click "Edit" to enter fundamental metrics
   - Compare multiple stocks in a table view
   - Delete stocks you no longer need
   - Clear all stocks at once
   - Data automatically syncs to cloud
3. **Firebase Setup** (Already Integrated):
   - See [FIREBASE_INTEGRATION_COMPLETE.md](FIREBASE_INTEGRATION_COMPLETE.md) for setup details
   - Firebase Authentication enabled (Email/Password + Google)
   - Firebase Realtime Database configured
   - Real-time sync working

## 📁 File Structure

```
stock-analysis/
├── index.html                          # Home page
├── pages/
│   └── analysis.html                   # Stock analysis page with Firebase auth
├── css/
│   ├── global.css                      # Global styles
│   ├── home.css                        # Home page styles
│   ├── analysis.css                    # Analysis page styles
│   └── firebase-auth.css               # Authentication UI styles
├── js/
│   ├── global.js                       # Global JavaScript
│   ├── analysis.js                     # Main application logic with Firebase
│   ├── fetch.js                        # Data fetching (Groww + Yahoo Finance)
│   ├── firebase-config.js              # Firebase configuration (gitignored)
│   ├── firebase-auth-service.js        # Authentication service
│   ├── firebase-database-service.js    # Database operations service
│   └── analysis-localStorage-backup.js # Original localStorage version (backup)
├── resource/
│   ├── stocks.json                     # Stock data
│   └── yahoo-symbols.json              # Yahoo Finance symbol mappings
├── .gitignore                          # Git ignore rules
├── README.md                           # This file
├── FIREBASE_INTEGRATION_COMPLETE.md    # Firebase setup guide
└── firebase-config.example.js          # Firebase config template
```

## 🔄 Data Fetching

### Dual Source Integration
The app now fetches data from **two sources simultaneously**:

1. **Groww.in**: Fetches fundamental metrics like ROE, P/E, Debt-to-Equity, Promoter Holdings, etc.
2. **Yahoo Finance**: Fetches additional metrics like ROA (%), EBITDA, P/S YoY, and BETA

When you click the **Fetch** button:
- Both sources are queried in parallel using `Promise.all()`
- Data is combined automatically
- The UI displays metrics from both sources
- If one source fails, the other continues (non-blocking)

### Yahoo Symbol Mapping
The file `resource/yahoo-symbols.json` maps stock symbols to Yahoo Finance format:
```json
{
  "ITC": "ITC.NS",
  "TCS": "TCS.NS",
  "RELIANCE": "RELIANCE.NS"
}
```

To add new stocks, update this file with the appropriate Yahoo Finance symbol (usually `SYMBOL.NS` for NSE stocks).

## 💾 Data Storage

### Firebase Realtime Database
- ✅ Cloud storage with automatic backup
- ✅ Real-time sync across all devices
- ✅ User authentication and security
- ✅ Access from anywhere
- ✅ Offline support with automatic sync
- ✅ User-specific data isolation (users/{userId}/stocks)
- ✅ Automatic localStorage fallback

### Data Structure
```
firebase-database/
└── users/
    └── {userId}/
        └── stocks/
            └── {stockId}/
                ├── symbol: "RELIANCE"
                ├── companyName: "Reliance Industries"
                ├── liquidity: "Yes"
                ├── quickRatio: "1.2"
                └── ... (all 13 metrics)
```

## 🚀 Firebase Setup Guide

### Prerequisites
1. Google account for Firebase Console access
2. Firebase project created at [Firebase Console](https://console.firebase.google.com/)

### Setup Steps

1. **Enable Firebase Services** (in Firebase Console):
   - Authentication → Sign-in method → Enable Email/Password and Google
   - Realtime Database → Create database → Start in test mode
   - Update security rules for production (see FIREBASE_INTEGRATION_COMPLETE.md)

2. **Configure Application**:
   - Your Firebase config is already integrated in `js/firebase-config.js`
   - Config is gitignored for security
   - Use `firebase-config.example.js` as template for new setups

3. **Deploy**:
   - Follow GitHub Pages deployment steps above
   - Or serve locally: `python3 -m http.server 8000`

### Security Rules (Production)
Update Realtime Database rules:
```json
{
  "rules": {
    "users": {
      "$userId": {
        ".read": "$userId === auth.uid",
        ".write": "$userId === auth.uid"
      }
    }
  }
}
```

For complete setup details, see [FIREBASE_INTEGRATION_COMPLETE.md](FIREBASE_INTEGRATION_COMPLETE.md)

## 🌐 Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## 🔮 Roadmap

### ✅ Phase 1: Firebase Integration (COMPLETE)
- [x] Planning and architecture
- [x] Firebase configuration
- [x] Authentication implementation (Email/Password + Google)
- [x] Real-time database integration
- [x] Offline support with localStorage fallback
- [x] User-specific data isolation
- [x] Authentication UI with modals
- [x] Testing and bug fixes

### Phase 2: Enhanced Features (Future)
- Export data to CSV/Excel
- Import data from CSV
- Charts and visualizations
- Stock comparison graphs
- Advanced filtering and sorting
- Multiple portfolios
- Sharing and collaboration

### Phase 3: Advanced Analytics (Future)
- Historical data tracking
- Performance metrics over time
- Automated alerts and notifications
- Market insights integration
- Portfolio optimization suggestions
- Real-time stock price integration

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

Free to use for personal and educational purposes.

## 📞 Support

For issues or questions:
1. Check [FIREBASE_INTEGRATION_COMPLETE.md](FIREBASE_INTEGRATION_COMPLETE.md) for Firebase setup
2. Review Firebase Console for service status
3. Check browser console for error messages
4. Open an issue on GitHub

## 🔧 Troubleshooting

### Common Issues

**"Firebase config not found"**
- Ensure `js/firebase-config.js` exists with your Firebase credentials
- Check that all Firebase services are enabled in Firebase Console

**"Authentication not working"**
- Verify Email/Password and Google Sign-In are enabled in Firebase Console
- Check that authorized domains include your deployment domain

**"Data not syncing"**
- Check internet connection
- Verify Realtime Database is created and rules allow read/write
- Check browser console for errors

**"Offline mode"**
- Data is stored in localStorage when offline
- Will automatically sync when connection is restored

---

**Made with ❤️ for Indian Stock Market Investors**

## Credits

Built with:
- [Bootstrap 5](https://getbootstrap.com/)
- [Bootstrap Icons](https://icons.getbootstrap.com/)
- [jQuery](https://jquery.com/)
- [Firebase](https://firebase.google.com/)

---

**Note**: This application uses Firebase for cloud storage and authentication. All user data is securely stored in Firebase Realtime Database with user-specific isolation.
