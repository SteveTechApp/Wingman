import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const base = process.env.WINGMAN_UI_AUDIT_BASE || 'http://127.0.0.1:3000';
const width = Number(process.env.WINGMAN_UI_AUDIT_WIDTH || 1440);
const mode = process.env.WINGMAN_UI_AUDIT_MODE || 'unguided';
const output = process.env.WINGMAN_UI_AUDIT_OUTPUT || 'data/runtime/ui-consistency';
const routes = JSON.parse(await fs.readFile('src/wingman2/app/route-manifest.json', 'utf8'));
routes.push({ key: 'dataManager', path: '/wingman/admin/data-manager' });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  await fs.mkdir(output, { recursive: true });
  const page = await browser.newPage({ viewport: { width, height: 1000 } });
  await page.addInitScript((mode) => localStorage.setItem('wingman-ui-mode-v1', mode), mode);
  await page.goto(`${base}/wingman/projects`);
  await page.getByRole('link', { name: 'Detail', exact: true }).first().click();
  routes.push({ key: 'projectDetail', path: new URL(page.url()).pathname });
  for (const route of routes) {
    if (process.env.WINGMAN_UI_AUDIT_KEYS && !process.env.WINGMAN_UI_AUDIT_KEYS.split(',').includes(route.key)) continue;
    try {
      await page.goto(`${base}${route.path}`, { waitUntil: 'domcontentloaded' });
      await page.locator('.wingman-topbar-page-label').waitFor({ state: 'attached', timeout: 10000 });
      await page.waitForTimeout(650);
      await page.screenshot({ path: `${output}/${route.key}.png` });
      const report = await page.evaluate(() => {
        const main = document.querySelector('.wingman-app-main');
        const frame = document.querySelector('.wm-app-page-frame');
        const next = document.querySelector('.wm-feature-journey');
        const previous = next?.previousElementSibling;
        const style = (el) => el ? { display: getComputedStyle(el).display, font: getComputedStyle(el).fontFamily, fontSize: getComputedStyle(el).fontSize, background: getComputedStyle(el).backgroundColor, radius: getComputedStyle(el).borderRadius, width: Math.round(el.getBoundingClientRect().width), height: Math.round(el.getBoundingClientRect().height) } : null;
        return { route: document.documentElement.dataset.wingmanRoute, overflow: document.documentElement.scrollWidth > innerWidth + 2, nextOverlaps: !!(next && previous && next.getBoundingClientRect().height > 0 && next.getBoundingClientRect().top < previous.getBoundingClientRect().bottom - 2), frame: style(frame), headings: [...(main?.querySelectorAll('h1') || [])].map(el => ({ text: el.textContent, ...style(el) })), button: style(main?.querySelector('.wm-ui-button')), error: /Something went wrong|Failed to load dynamically imported/.test(main?.textContent || '') };
      });
      results.push({ key: route.key, path: route.path, ...report });
      console.log(`${route.key}: ${report.error ? 'ERROR' : 'ok'}${report.overflow ? ' overflow' : ''}${report.nextOverlaps ? ' next-tools overlap' : ''}`);
    } catch (error) { results.push({ key: route.key, error: String(error) }); console.log(`${route.key}: ${error.message}`); }
  }
  await fs.writeFile(`${output}/report.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }
