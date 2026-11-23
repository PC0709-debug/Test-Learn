// tools/make-icons.js — renders icons/icon.svg to the PNG sizes iPhone and
// Android want. Run once with: node tools/make-icons.js (needs Playwright).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
(async () => {
  const svg = fs.readFileSync(path.join(__dirname, '../icons/icon.svg'), 'utf8');
  const browser = await chromium.launch();
  for (const size of [180, 192, 512]) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
    await page.screenshot({ path: path.join(__dirname, `../icons/icon-${size}.png`) });
  }
  await browser.close();
})();
