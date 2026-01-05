// scripts/minify.js
// Bundles and minifies all JS and CSS for the site into js/bundle.min.js and css/bundle.min.css
// Run with: node scripts/minify.js

const { build } = require('esbuild');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// JS bundling
const jsDir = path.join(__dirname, '../js');
const jsOut = path.join(__dirname, '../js/bundle.min.js');

// CSS bundling
const cssDir = path.join(__dirname, '../css');
const cssOut = path.join(__dirname, '../css/bundle.min.css');


// Get all JS files (exclude .min.js)
const jsFiles = fs.readdirSync(jsDir)
  .filter(f => f.endsWith('.js') && !f.endsWith('.min.js'));

// Create a temporary entry file that imports all JS files
const tempEntryPath = path.join(__dirname, '_bundle-entry.js');
const importLines = jsFiles.map(f => `import '../js/${f.replace(/'/g, "\\'")}'`).join(';
') + ';\n';
fs.writeFileSync(tempEntryPath, importLines);

// Get all CSS files (exclude .min.css)
const cssFiles = fs.readdirSync(cssDir)
  .filter(f => f.endsWith('.css') && !f.endsWith('.min.css'))
  .map(f => path.join(cssDir, f));


// Bundle and minify JS using the temp entry file
build({
  entryPoints: [tempEntryPath],
  bundle: true,
  minify: true,
  outfile: jsOut,
  sourcemap: false,
  legalComments: 'none',
}).then(() => {
  fs.unlinkSync(tempEntryPath);
  console.log('JS bundled and minified.');
}).catch((e) => {
  if (fs.existsSync(tempEntryPath)) fs.unlinkSync(tempEntryPath);
  console.error('JS minification failed:', e);
  process.exit(1);
});

// Concatenate all CSS, then minify with cssnano-cli
const cssConcat = cssFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');
fs.writeFileSync(cssOut.replace('.min.css', '.concat.css'), cssConcat);
try {
  execSync(`npx cssnano ${cssOut.replace('.min.css', '.concat.css')} ${cssOut}`);
  fs.unlinkSync(cssOut.replace('.min.css', '.concat.css'));
  console.log('CSS bundled and minified.');
} catch (e) {
  console.error('CSS minification failed:', e);
  process.exit(1);
}
