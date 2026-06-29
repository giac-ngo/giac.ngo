const puppeteer = require('puppeteer');

(async () => {
  console.log('Launching browser via Puppeteer...');
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Give a short delay for dynamic React title resolution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const title = await page.title();
    console.log(`Page title dynamically resolved: "${title}"`);
    
    const expectedPattern = /Giác Ngộ|Awakening AI|Bodhilab Admin/i;
    if (expectedPattern.test(title)) {
      console.log('SUCCESS: Puppeteer E2E Test Passed!');
      await browser.close();
      process.exit(0);
    } else {
      console.error('FAILURE: Page title does not match expected templates.');
      await browser.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('Puppeteer encountered an error:', err.message);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
})();
