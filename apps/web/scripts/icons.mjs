// Generates the logo, favicons, share image and the desktop master icon from one
// SVG definition (the Ethiopian hand cross over a double square).
//   node scripts/icons.mjs        then, for desktop: pnpm --filter desktop tauri icon src-tauri/app-icon.png
// Uses the installed Chrome; set CHROME_PATH to point at another browser.
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const GOLD = '#EDC25E';
const CRIMSON = '#5E1620';

const ARM = 'M46 42 L46 25 L39.5 21 L42.5 15.5 L47 17 L50 9 L53 17 L57.5 15.5 L60.5 21 L54 25 L54 42';
const KNOBS = [[50, 5.5, 2.6], [37.6, 21.6, 2.3], [62.4, 21.6, 2.3]];

/** The cross in a 0..100 box. `simple` drops the fine lines so it survives 16-32 px. */
function mark({ color = GOLD, ground = CRIMSON, w = 2.8, simple = false } = {}) {
  const arms = [0, 90, 180, 270].map(r => `<g transform="rotate(${r} 50 50)">
    <path d="${ARM}" fill="${ground}"/>${simple ? '' : `<path d="M50 40 L50 22" fill="none" stroke-width="${w * 0.7}"/>`}
    ${KNOBS.map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${simple ? rr * 1.3 : rr}" fill="${color}" stroke="none"/>`).join('')}
  </g>`).join('');
  return `<g fill="none" stroke="${color}" stroke-width="${w}">
    <rect x="27" y="27" width="46" height="46"/>${simple ? '' : '<rect x="32.5" y="32.5" width="35" height="35"/>'}
  </g>
  <g stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round">${arms}
    <path d="M50 38 L62 50 L50 62 L38 50 Z" fill="${ground}"/>
    <path d="M50 44.5 L55.5 50 L50 55.5 L44.5 50 Z" fill="${color}" stroke="none"/>
  </g>`;
}

/** Square tile: `inset` is the mark's margin, `radius` the tile corner (0..50). */
const tile = ({ inset = 14, radius = 22, pad = 0, bg = CRIMSON, ...m } = {}) => {
  const s = 100 - 2 * pad, k = (s - 2 * inset) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect x="${pad}" y="${pad}" width="${s}" height="${s}" rx="${(s * radius) / 100}" fill="${bg}"/>
  <g transform="translate(${pad + inset} ${pad + inset}) scale(${k})">${mark(m)}</g>
</svg>`;
};

const logoSvg = tile();
const faviconSvg = tile({ inset: 6, radius: 18, w: 6, simple: true });
writeFileSync('public/logo.svg', logoSvg);
writeFileSync('public/favicon.svg', faviconSvg);
// In-app header badge: crimson cross on white.
const badgeSvg = tile({ inset: 8, radius: 22, w: 5, simple: true, bg: '#FFFFFF', color: CRIMSON, ground: '#FFFFFF' });
for (const dir of ['public', '../desktop/public']) writeFileSync(`${dir}/logo-white.svg`, badgeSvg);
writeFileSync('../desktop/public/favicon.svg', faviconSvg);
// Header lockup marks without a tile; `ground` matches the toolbar surface so the arms read as woven over the square.
const bare = m => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${mark({ w: 4, ...m })}</svg>`;
writeFileSync('public/mark-light.svg', bare({ color: CRIMSON, ground: '#FFFFFF' }));
writeFileSync('public/mark-dark.svg', bare({ color: GOLD, ground: '#141414' }));

const og = `<!doctype html><html><head>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+Ethiopic:wght@700&family=Marcellus&display=swap">
<style>body{margin:0}main{width:1200px;height:630px;background:${CRIMSON};display:flex;align-items:center;gap:64px;padding:0 96px;box-sizing:border-box;color:${GOLD};font-family:Marcellus,serif}
h1{font-family:'Noto Serif Ethiopic',serif;font-size:120px;margin:0;line-height:1}p{margin:0}</style></head>
<body><main><svg viewBox="0 0 100 100" width="360" height="360">${mark()}</svg>
<div><h1>ቅዳሴ</h1><p style="font-size:44px;letter-spacing:.12em;margin-top:20px">KIDASE PRESENTATION</p>
<p style="font-size:26px;margin-top:28px;color:#F3EEE4;opacity:.85">Ge'ez · Amharic · Tigrinya · English</p></div></main></body></html>`;

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : { channel: 'chrome' });
try {
  const page = await browser.newPage();
  const shot = async (html, size, path, opts = {}) => {
    await page.setViewportSize({ width: size[0], height: size[1] });
    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.screenshot({ path, omitBackground: true, ...opts });
  };
  const svgPage = svg => `<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${svg}`;
  await shot(svgPage(faviconSvg), [32, 32], 'public/favicon-32.png');
  // iOS masks its own corners, so the touch icon is full bleed.
  await shot(svgPage(tile({ radius: 0 })), [180, 180], 'public/apple-touch-icon.png');
  await shot(og, [1200, 630], 'public/og-image.png', { omitBackground: false });
  // macOS-style master: rounded tile inset on a transparent 1024 canvas.
  await shot(svgPage(tile({ pad: 10, inset: 9, radius: 22 })), [1024, 1024], '../desktop/src-tauri/app-icon.png');
  console.log('Wrote public/{logo,favicon}.svg, favicon-32.png, apple-touch-icon.png, og-image.png, desktop app-icon.png');
} finally {
  await browser.close();
}
