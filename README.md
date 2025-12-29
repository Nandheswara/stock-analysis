# Stock Analysis Dashboard

A static HTML/CSS/JavaScript web application for analyzing Indian stocks with fundamental metrics.

## Features

- 📊 **Stock Analysis**: Add and analyze multiple stocks side-by-side
- 📝 **Manual Data Entry**: Enter fundamental metrics for each stock
- 💾 **Local Storage**: All data is saved locally in your browser
- 📱 **Responsive Design**: Works on desktop, tablet, and mobile devices
- 🎨 **Modern UI**: Clean and intuitive interface built with Bootstrap 5

## 13 Key Fundamental Metrics

1. Liquidity (Cash More than Debt)
2. Quick Ratio (In-Hand Cash)
3. Leverage (Debt Equity Ratio)
4. Profitability (ROE)
5. Investor's Money Growth Ratio
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
- **JavaScript**: Vanilla JS with jQuery
- **Bootstrap 5**: UI framework
- **Bootstrap Icons**: Icon library
- **LocalStorage API**: Client-side data persistence

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
   - Add stocks by entering Symbol and Company Name
   - Click "Edit" to enter fundamental metrics
   - Compare multiple stocks in a table view
   - Delete stocks you no longer need
   - Clear all stocks at once

## File Structure

```
stock-analysis/
├── index.html           # Home page
├── analysis.html        # Stock analysis page
├── css/
│   └── style.css       # Custom styles
├── js/
│   └── analysis.js     # Analysis page functionality
└── README.md           # This file
```

## Data Storage

All data is stored locally in your browser using LocalStorage. This means:
- ✅ No server required
- ✅ Data persists between sessions
- ✅ Complete privacy - no data sent to servers
- ⚠️ Data is browser-specific (not synced across devices)
- ⚠️ Clearing browser data will delete saved stocks

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Full support

## Future Enhancements

- Export data to CSV/Excel
- Import data from CSV
- Charts and visualizations
- Stock comparison graphs
- Dark mode
- Multiple portfolios

## License

Free to use for personal and educational purposes.

## Credits

Built with:
- [Bootstrap 5](https://getbootstrap.com/)
- [Bootstrap Icons](https://icons.getbootstrap.com/)
- [jQuery](https://jquery.com/)

---

**Note**: This is a static application. All data is stored locally in your browser. No backend server or database is required.
