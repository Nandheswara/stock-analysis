# Quick GitHub Pages Deployment Guide

## Step 1: Prepare Your Repository

Navigate to the stock-analysis folder:
```bash
cd stock-analysis
```

## Step 2: Initialize Git (if not already done)

```bash
git init
```

## Step 3: Add All Files

```bash
git add .
```

## Step 4: Commit Your Files

```bash
git commit -m "Initial commit - Stock Analysis Dashboard"
```

## Step 5: Create a GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., "stock-analysis-dashboard")
3. Don't initialize with README (we already have one)

## Step 6: Connect to GitHub

Replace `YOUR_USERNAME` and `YOUR_REPO_NAME` with your actual GitHub username and repository name:

```bash
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## Step 7: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click "Settings" tab
3. Scroll down to "Pages" section (left sidebar)
4. Under "Source":
   - Select branch: **main**
   - Select folder: **/ (root)**
5. Click "Save"

## Step 8: Access Your Site

Your site will be live at:
```
https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
```

⏱️ **Note**: Initial deployment may take 2-10 minutes.

## Step 9: Share Your Site

Your application is now live! Share the URL with anyone to use your Stock Analysis Dashboard.

---

## Updating Your Site

After making changes to your files:

```bash
git add .
git commit -m "Description of changes"
git push
```

GitHub Pages will automatically update your site within a few minutes.

---

## Troubleshooting

### Site not loading?
- Wait 5-10 minutes after initial deployment
- Check GitHub Pages settings are correct
- Ensure `index.html` is in the root folder

### 404 Error?
- Verify the URL format: `https://USERNAME.github.io/REPO_NAME/`
- Check that GitHub Pages is enabled in settings

### Styles not loading?
- Open browser console (F12) to check for errors
- Ensure all file paths are relative (not absolute)

---

## Alternative: Custom Domain

Want to use your own domain? 
1. Add a `CNAME` file with your domain name
2. Configure DNS settings with your domain provider
3. See: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site
