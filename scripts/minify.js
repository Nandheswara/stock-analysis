// scripts/minify.js
// Minifies individual JS and CSS files instead of bundling (to preserve ES6 modules)
// Run with: node scripts/minify.js

const { build } = require('esbuild');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// JS directory
const jsDir = path.join(__dirname, '../js');

// CSS bundling
const cssDir = path.join(__dirname, '../css');
const cssOut = path.join(__dirname, '../css/bundle.min.css');

// Get all JS files (exclude .min.js and Node.js server files)
const jsFiles = fs.readdirSync(jsDir)
  .filter(f => f.endsWith('.js') && !f.endsWith('.min.js') && f !== 'cors-proxy.js');

// Minify each JS file individually to preserve module structure
console.log('Minifying JS files...');
const jsPromises = jsFiles.map(file => {
  const inputPath = path.join(jsDir, file);
  const outputPath = path.join(jsDir, file.replace('.js', '.min.js'));
  
  return build({
    entryPoints: [inputPath],
    bundle: false,
    minify: true,
    outfile: outputPath,
    platform: 'browser',
    format: 'esm',
    sourcemap: false,
    legalComments: 'none',
  }).then(() => {
    // Update import statements to reference .min.js files
    let content = fs.readFileSync(outputPath, 'utf8');
    content = content.replace(/from\s*['"]\.\/([^'"]+)\.js['"]/g, 'from "./$1.min.js"');
    content = content.replace(/from\s*['"]\.\.\/js\/([^'"]+)\.js['"]/g, 'from "../js/$1.min.js"');
    fs.writeFileSync(outputPath, content);
    console.log(`  ✓ ${file} -> ${file.replace('.js', '.min.js')}`);
  }).catch((e) => {
    console.error(`  ✗ ${file} failed:`, e.message);
    throw e;
  });
});

Promise.all(jsPromises).then(() => {
  console.log('All JS files minified successfully.');
}).catch((e) => {
  console.error('JS minification failed:', e);
  process.exit(1);
});

// CSS files in specific order (general -> specific for proper cascading)
// This ensures more specific styles override general ones
const cssFileOrder = [
  'critical.css',      // Bootstrap critical styles first
  'style.css',         // Legacy styles
  'global.css',        // Global styles and base theme
  'analysis.css',      // Analysis page specific
  'metrics.css',       // Metrics specific
  'profile.css',       // Profile page specific
  'firebase-auth.css', // Auth modal styles
  'home.css',          // Home page specific
  'stock-manager.css', // Stock manager (LAST to override buttons and table styles)
];

// Build CSS file paths in order, fallback to all CSS files if some are missing
const cssFiles = [];
cssFileOrder.forEach(fileName => {
  const filePath = path.join(cssDir, fileName);
  if (fs.existsSync(filePath)) {
    cssFiles.push(filePath);
  }
});

// Add any CSS files not in the order list
const allCssFiles = fs.readdirSync(cssDir)
  .filter(f => f.endsWith('.css') && !f.endsWith('.min.css'))
  .map(f => path.join(cssDir, f));

allCssFiles.forEach(file => {
  if (!cssFiles.includes(file)) {
    cssFiles.push(file);
  }
});

// Concatenate all CSS, then minify with cssnano-cli
console.log('Bundling and minifying CSS...');
console.log('CSS file order:', cssFiles.map(f => path.basename(f)).join(' -> '));
const cssConcat = cssFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
fs.writeFileSync(cssOut.replace('.min.css', '.concat.css'), cssConcat);
try {
  execSync(`npx cssnano ${cssOut.replace('.min.css', '.concat.css')} ${cssOut}`);
  fs.unlinkSync(cssOut.replace('.min.css', '.concat.css'));
  const cssSize = (fs.statSync(cssOut).size / 1024).toFixed(2);
  console.log(`CSS bundled and minified (${cssSize}KB)`);
} catch (e) {
  console.error('CSS minification failed:', e);
  process.exit(1);
}
