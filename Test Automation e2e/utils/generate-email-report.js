import fs from 'fs';
import path from 'path';

/**
 * Aggregates multi-device Playwright results from all matrix artifacts
 * and generates a styled HTML email report and export variables.
 */
function generateEmailReport() {
  const reportsDir = path.resolve(process.cwd(), 'all-reports');
  const runId = process.env.GITHUB_RUN_ID || '';
  const runNumber = process.env.GITHUB_RUN_NUMBER || '1';
  const repo = process.env.GITHUB_REPOSITORY || 'Nandheswara/stock-analysis';
  const branch = process.env.GITHUB_REF_NAME || 'feature/test-automation';
  const overallStatus = process.env.TEST_JOB_STATUS === 'success';

  const projects = ['desktop', 'tablet', 'mobile'];
  const projectSummaries = {};
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalFlaky = 0;
  let totalSkipped = 0;

  for (const proj of projects) {
    const jsonPath = path.join(reportsDir, `playwright-report-${proj}`, 'results.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
        const stats = raw.stats || {};
        const p = stats.expected || 0;
        const f = stats.unexpected || 0;
        const fl = stats.flaky || 0;
        const sk = stats.skipped || 0;
        totalTests += (p + f + fl + sk);
        totalPassed += p;
        totalFailed += f;
        totalFlaky += fl;
        totalSkipped += sk;

        projectSummaries[proj] = {
          passed: p,
          failed: f,
          flaky: fl,
          skipped: sk,
          duration: ((stats.duration || 0) / 1000).toFixed(1),
          status: f === 0 && p > 0 ? 'Passed' : f > 0 ? 'Failed' : 'Skipped'
        };
      } catch (err) {
        console.warn(`Could not parse results for ${proj}:`, err.message);
      }
    }
  }

  const isSuccess = totalFailed === 0 && totalTests > 0;
  const statusEmoji = isSuccess ? '✅' : '❌';
  const statusText = isSuccess ? 'All Tests Passed' : `${totalFailed} Test(s) Failed`;
  const statusColor = isSuccess ? '#198754' : '#dc3545';
  const runUrl = `https://github.com/${repo}/actions/runs/${runId}`;

  const subject = `[CI] Equity Labs E2E Report: ${statusEmoji} ${statusText} (Run #${runNumber} - ${branch})`;

  // Build clean responsive HTML email
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .card { background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; max-width: 650px; margin: 0 auto; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%); padding: 24px 28px; text-align: left; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; color: #ffffff; }
    .header p { margin: 0; color: #e2e8f0; font-size: 14px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 20px; font-weight: bold; font-size: 14px; color: #ffffff; background-color: ${statusColor}; margin-top: 10px; }
    .content { padding: 24px 28px; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .meta-table td { padding: 6px 0; font-size: 13px; color: #94a3b8; }
    .meta-table td strong { color: #f1f5f9; }
    .results-table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; border-radius: 8px; overflow: hidden; }
    .results-table th { background-color: #0f172a; color: #cbd5e1; padding: 10px 14px; font-size: 12px; text-align: left; text-transform: uppercase; letter-spacing: 0.5px; }
    .results-table td { padding: 12px 14px; border-top: 1px solid #334155; font-size: 13px; color: #e2e8f0; }
    .tag { font-weight: 600; padding: 3px 8px; border-radius: 4px; font-size: 11px; }
    .tag-passed { background: #064e3b; color: #34d399; }
    .tag-failed { background: #7f1d1d; color: #f87171; }
    .btn-container { text-align: center; margin: 28px 0 12px 0; }
    .btn { display: inline-block; background-color: #3b82f6; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .footer { border-top: 1px solid #334155; padding: 16px 28px; text-align: center; font-size: 12px; color: #64748b; background-color: #172033; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>🚀 Equity Labs Test Automation</h1>
      <p>Continuous Integration Multi-Device E2E Report</p>
      <div class="badge">${statusEmoji} ${statusText}</div>
    </div>
    <div class="content">
      <table class="meta-table">
        <tr>
          <td>Repository: <strong>${repo}</strong></td>
          <td>Branch: <strong>${branch}</strong></td>
        </tr>
        <tr>
          <td>Workflow Run: <strong>#${runNumber}</strong></td>
          <td>Total Tests Executed: <strong>${totalTests}</strong></td>
        </tr>
      </table>

      <h3 style="font-size: 15px; margin: 20px 0 10px 0; color: #f8fafc;">📱 Multi-Device Platform Matrix</h3>
      <table class="results-table">
        <thead>
          <tr>
            <th>Profile</th>
            <th>Resolution</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>💻 <strong>Desktop Chrome</strong></td>
            <td>1280 x 720</td>
            <td>${projectSummaries['desktop']?.passed ?? '-'}</td>
            <td>${projectSummaries['desktop']?.failed ?? '-'}</td>
            <td><span class="tag ${projectSummaries['desktop']?.status === 'Passed' ? 'tag-passed' : 'tag-failed'}">${projectSummaries['desktop']?.status ?? 'Pending'}</span></td>
          </tr>
          <tr>
            <td>📱 <strong>Tablet (Galaxy Tab S4)</strong></td>
            <td>712 x 1138</td>
            <td>${projectSummaries['tablet']?.passed ?? '-'}</td>
            <td>${projectSummaries['tablet']?.failed ?? '-'}</td>
            <td><span class="tag ${projectSummaries['tablet']?.status === 'Passed' ? 'tag-passed' : 'tag-failed'}">${projectSummaries['tablet']?.status ?? 'Pending'}</span></td>
          </tr>
          <tr>
            <td>📱 <strong>Mobile (Pixel 5)</strong></td>
            <td>393 x 851</td>
            <td>${projectSummaries['mobile']?.passed ?? '-'}</td>
            <td>${projectSummaries['mobile']?.failed ?? '-'}</td>
            <td><span class="tag ${projectSummaries['mobile']?.status === 'Passed' ? 'tag-passed' : 'tag-failed'}">${projectSummaries['mobile']?.status ?? 'Pending'}</span></td>
          </tr>
        </tbody>
      </table>

      <div class="btn-container">
        <a href="${runUrl}" class="btn" target="_blank">View GitHub Actions Run & Artifacts &rarr;</a>
      </div>
    </div>
    <div class="footer">
      Automated by Equity Labs CI/CD • <a href="https://github.com/${repo}" style="color: #94a3b8; text-decoration: underline;">${repo}</a>
    </div>
  </div>
</body>
</html>
  `.trim();

  // Ensure output directory exists
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const outputPath = path.join(reportsDir, 'email-report.html');
  fs.writeFileSync(outputPath, html, 'utf8');
  console.log(`[Email Report] Generated HTML email template at: ${outputPath}`);

  // Write variables to GITHUB_ENV if in CI
  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, `EMAIL_SUBJECT=${subject}\n`, 'utf8');
    fs.appendFileSync(process.env.GITHUB_ENV, `EMAIL_IS_SUCCESS=${isSuccess}\n`, 'utf8');
  }
}

generateEmailReport();

