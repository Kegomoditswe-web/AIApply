const puppeteer = require('puppeteer');
(async () => {
  const url = process.argv[2] || 'https://ai-powered-job-applicati-c6894.web.app';
  const out = process.argv[3] || 'screenshot.png';
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.screenshot({ path: out, fullPage: true });
    await browser.close();
    console.log('Saved', out);
  } catch (err) {
    console.error('Screenshot failed:', err);
    process.exit(1);
  }
})();
