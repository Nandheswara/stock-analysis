import fs from 'fs';
import path from 'path';

/**
 * Generate GitHub Actions Step Summary & Dashboard from Playwright JSON results.
 */
function generateSummary() {
  const reportPath = path.resolve(process.cwd(), 'playwright-report/results.json');
  const summaryOutputPath = path.resolve(process.cwd(), 'playwright-report/summary.md');

  if (!fs.existsSync(reportPath)) {
    console.warn(`[Summary Generator] Report file not found at ${reportPath}`);
    return;
  }

  const rawData = fs.readFileSync(reportPath, 'utf8');
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (err) {
    console.error('[Summary Generator] Failed to parse JSON report:', err);
    return;
  }

  const stats = data.stats || {};
  const totalDurationSec = ((stats.duration || 0) / 1000).toFixed(1);
  const totalPassed = stats.expected || 0;
  const totalFailed = stats.unexpected || 0;
  const totalFlaky = stats.flaky || 0;
  const totalSkipped = stats.skipped || 0;
  const totalTests = totalPassed + totalFailed + totalFlaky + totalSkipped;
  const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '0';

  const isSuccess = totalFailed === 0;
  const statusEmoji = isSuccess ? '✅' : '❌';
  const statusText = isSuccess ? 'All Tests Passed' : `${totalFailed} Test(s) Failed`;

  // Aggregate by Project / Device
  const projectStats = {
    desktop: { passed: 0, failed: 0, flaky: 0, skipped: 0, duration: 0 },
    tablet: { passed: 0, failed: 0, flaky: 0, skipped: 0, duration: 0 },
    mobile: { passed: 0, failed: 0, flaky: 0, skipped: 0, duration: 0 }
  };

  // Aggregate by Suite
  const suiteStats = {};
  const failedTests = [];

  function processSuite(suite, suiteName) {
    const currentSuiteName = suite.title && suite.title.includes(':') 
      ? suite.title.split(':')[0].trim() 
      : suiteName || suite.title || 'General';

    if (suite.suites && suite.suites.length > 0) {
      for (const childSuite of suite.suites) {
        processSuite(childSuite, currentSuiteName);
      }
    }

    if (suite.specs && suite.specs.length > 0) {
      for (const spec of suite.specs) {
        for (const test of spec.tests || []) {
          const proj = test.projectName || 'unknown';
          if (!projectStats[proj]) {
            projectStats[proj] = { passed: 0, failed: 0, flaky: 0, skipped: 0, duration: 0 };
          }

          const category = classifySuite(spec.file || suite.file || currentSuiteName);
          if (!suiteStats[category]) {
            suiteStats[category] = { passed: 0, failed: 0, flaky: 0, total: 0 };
          }
          suiteStats[category].total++;

          const result = test.results && test.results[test.results.length - 1];
          const duration = result ? result.duration : 0;
          projectStats[proj].duration += duration;

          if (test.status === 'expected') {
            projectStats[proj].passed++;
            suiteStats[category].passed++;
          } else if (test.status === 'unexpected') {
            projectStats[proj].failed++;
            suiteStats[category].failed++;
            const errorMessage = result && result.errors && result.errors.length > 0
              ? result.errors.map(e => e.message || e.value || '').join('\n')
              : 'Unknown error';
            failedTests.push({
              title: spec.title,
              project: proj,
              file: spec.file,
              error: errorMessage
            });
          } else if (test.status === 'flaky') {
            projectStats[proj].flaky++;
            suiteStats[category].flaky++;
          } else if (test.status === 'skipped') {
            projectStats[proj].skipped++;
          }
        }
      }
    }
  }

  function classifySuite(filePath) {
    if (!filePath) return 'Other';
    if (filePath.includes('finance-tracker')) return 'Finance Tracker';
    if (filePath.includes('navigation') || filePath.includes('smoke')) return 'Smoke & Navigation';
    if (filePath.includes('auth')) return 'Auth & Security';
    if (filePath.includes('stock-analysis')) return 'Stock Analysis & Screener';
    if (filePath.includes('budget-planner')) return 'Budget Planner';
    if (filePath.includes('stock-manager')) return 'Stock Manager';
    if (filePath.includes('news')) return 'Market News';
    return 'Core Application';
  }

  for (const rootSuite of data.suites || []) {
    processSuite(rootSuite, '');
  }

  // Format Markdown Dashboard
  let md = '';

  md += `# 🚀 Equity Labs E2E Test Automation Dashboard\n\n`;
  md += `> **Status**: ${statusEmoji} **${statusText}** (${passRate}% Success Rate) | **Duration**: ⏱️ ${totalDurationSec}s | **Total Tests**: ${totalTests}\n\n`;

  // Summary Metrics Table
  md += `### 📊 High-Level Test Execution Summary\n\n`;
  md += `| Total Tests | Passed | Failed | Flaky | Skipped | Pass Rate | Total Duration |\n`;
  md += `| :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
  md += `| **${totalTests}** | 🟢 **${totalPassed}** | ${totalFailed > 0 ? `🔴 **${totalFailed}**` : '0'} | ${totalFlaky > 0 ? `🟡 **${totalFlaky}**` : '0'} | ${totalSkipped > 0 ? `⚪ **${totalSkipped}**` : '0'} | **${passRate}%** | ⏱️ **${totalDurationSec}s** |\n\n`;

  // Device Matrix Table
  md += `### 📱 Multi-Device Platform Matrix\n\n`;
  md += `| Device Profile | Emulation Target | Resolution / Viewport | Passed | Failed | Status |\n`;
  md += `| :--- | :--- | :---: | :---: | :---: | :---: |\n`;

  const deviceMap = {
    desktop: { name: '💻 Desktop Chrome', target: 'Chromium Desktop', res: '1280 x 720' },
    tablet: { name: '📱 Tablet', target: 'Samsung Galaxy Tab S4', res: '712 x 1138' },
    mobile: { name: '📱 Mobile', target: 'Google Pixel 5', res: '393 x 851' }
  };

  for (const [projKey, info] of Object.entries(deviceMap)) {
    const s = projectStats[projKey] || { passed: 0, failed: 0 };
    const status = s.failed === 0 && s.passed > 0 ? '🟢 All Passed' : s.failed > 0 ? '🔴 Failed' : '⚪ Skipped';
    md += `| **${info.name}** | ${info.target} | \`${info.res}\` | ${s.passed} | ${s.failed} | ${status} |\n`;
  }
  md += `\n`;

  // Feature Suite Breakdown
  md += `### 📑 Feature Suite Breakdown\n\n`;
  md += `| Feature Suite | Total Runs | Passed | Failed | Health |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: |\n`;

  for (const [suiteName, s] of Object.entries(suiteStats)) {
    const health = s.failed === 0 ? '🟢 100%' : `🔴 ${(((s.passed) / s.total) * 100).toFixed(0)}%`;
    md += `| **${suiteName}** | ${s.total} | ${s.passed} | ${s.failed} | ${health} |\n`;
  }
  md += `\n`;

  // Failed Tests Diagnostic Section
  if (failedTests.length > 0) {
    md += `### ⚠️ Failed Tests Diagnostics (${failedTests.length})\n\n`;
    for (const failure of failedTests) {
      md += `<details>\n`;
      md += `<summary>🔴 <b>${failure.project}</b>: ${failure.title}</summary>\n\n`;
      md += `* **File**: \`${failure.file}\`\n`;
      md += `* **Project**: \`${failure.project}\`\n\n`;
      md += `\`\`\`\n${failure.error.slice(0, 1000)}\n\`\`\`\n`;
      md += `</details>\n\n`;
    }
  }

  // Interactive HTML Report & Download Guide
  md += `### 📥 Interactive Test Report & Artifacts\n\n`;
  md += `A full interactive HTML report with step-by-step traces, console logs, and failure screenshots has been archived.\n\n`;
  md += `#### How to view and download the report:\n`;
  md += `1. **Download**: Scroll to the bottom of this GitHub Actions run page and find the **Artifacts** table.\n`;
  md += `2. **Extract**: Click **\`playwright-report\`** to download the ZIP file and extract it on your computer.\n`;
  md += `3. **View**: Open \`index.html\` directly in your browser, or run:\n`;
  md += `   \`\`\`bash\n`;
  md += `   npx playwright show-report path/to/extracted-folder\n`;
  md += `   \`\`\`\n\n`;
  md += `> 💡 **Live Test Monitoring**: In future runs, you can click into the **Run Playwright Tests** step in the workflow to watch tests executing live in real time.\n\n`;
  md += `---\n*Generated automatically by Equity Labs Playwright CI Automation*\n`;

  // Write to summary output
  fs.writeFileSync(summaryOutputPath, md, 'utf8');
  console.log(`[Summary Generator] Successfully generated summary at ${summaryOutputPath}`);

  // Write to GitHub Actions Step Summary if available
  if (process.env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md, 'utf8');
      console.log(`[Summary Generator] Successfully written to GITHUB_STEP_SUMMARY`);
    } catch (err) {
      console.error('[Summary Generator] Failed to write to GITHUB_STEP_SUMMARY:', err);
    }
  }
}

generateSummary();

