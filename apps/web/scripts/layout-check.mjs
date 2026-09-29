// Renders slides in a real browser and fails when the layout breaks its limits
// (overflow, tiny text, stretched word gaps, wrapped footer).
//   pnpm --filter web layout-check            fixtures, no API needed
//   pnpm --filter web layout-check -- --live  every slide from the local API
// Uses the installed Chrome; set CHROME_PATH to point at another browser.
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const live = process.argv.includes('--live');
const dateArg = process.argv.find(a => a.startsWith('--date='));

const server = await createServer({ server: { port: 0, strictPort: false }, logLevel: 'error' });
await server.listen();
const { port } = server.httpServer.address();

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' },
);
let failed = true;
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  const query = live ? `?live${dateArg ? `&date=${dateArg.slice(7)}` : ''}` : '';
  await page.goto(`http://localhost:${port}/layout-check.html${query}`);
  await page.waitForFunction(() => window.__layoutReport, null, { timeout: 120_000 });
  const report = await page.evaluate(() => window.__layoutReport);

  if (report.error) {
    console.error(`Layout check could not run: ${report.error}`);
  } else {
    console.log(
      `${report.total} slides checked (${live ? 'live' : 'fixtures'}): ` +
      `smallest text ${Math.round(report.minFontPx)}px, widest word gap ${report.maxWordGapEm.toFixed(2)}em, ` +
      `${report.fillUnder60} under 60% fill`,
    );
    for (const f of report.failures) console.error(`FAIL ${f.name}: ${f.problems.join('; ')}`);
    failed = report.total === 0 || report.failures.length > 0;
    console.log(failed ? `${report.failures.length} slides failed` : 'All slides within limits');
  }
} finally {
  await browser.close();
  await server.close();
}
process.exit(failed ? 1 : 0);
