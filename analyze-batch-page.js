const puppeteer = require('puppeteer');

async function analyzeBatchPage() {
  let browser = null;
  let page = null;

  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');

    const batchUrl = 'https://v1.samehadaku.how/batch/witch-watch-episode-1-25-batch/';
    console.log(`Navigating to ${batchUrl}...`);

    await page.goto(batchUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20000
    });

    console.log('Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get all links on the page
    const allLinks = await page.evaluate(() => {
      const links = [];
      document.querySelectorAll('a').forEach(a => {
        const href = a.href;
        const text = a.textContent.trim();
        if (href && href.length > 10) {
          links.push({ href, text });
        }
      });
      return links;
    });

    console.log(`\nFound ${allLinks.length} total links`);

    // Filter for download-related links
    const downloadLinks = allLinks.filter(link =>
      link.href.includes('acefile') ||
      link.href.includes('bayfiles') ||
      link.href.includes('letsupload') ||
      link.href.includes('mega.nz') ||
      link.href.includes('mediafire') ||
      link.href.includes('zippyshare') ||
      link.href.includes('drive.google') ||
      link.href.includes('download') ||
      link.href.includes('batch') ||
      link.href.includes('.rar') ||
      link.href.includes('.mkv') ||
      link.href.includes('.mp4') ||
      link.text.toLowerCase().includes('download')
    );

    console.log(`\nFound ${downloadLinks.length} potential download links:`);
    downloadLinks.forEach((link, i) => {
      console.log(`${i + 1}. ${link.text} -> ${link.href}`);
    });

    // Check for specific selectors
    const selectors = [
      '.download-link',
      '.batch-download',
      '.dl-link',
      '.server-list',
      '.download-server',
      '.server',
      '[class*="download"]',
      '[class*="server"]'
    ];

    console.log('\nChecking selectors:');
    for (const selector of selectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`${selector}: ${elements.length} elements`);
        // Get first element details
        const firstElement = await page.evaluate(el => ({
          tagName: el.tagName,
          className: el.className,
          textContent: el.textContent.trim(),
          innerHTML: el.innerHTML.substring(0, 200)
        }), elements[0]);
        console.log(`  First element: ${JSON.stringify(firstElement, null, 2)}`);
      }
    }

    // Get page title and basic info
    const pageInfo = await page.evaluate(() => {
      const title = document.querySelector('h1, .entry-title, .post-title')?.textContent?.trim() || '';
      const infoElements = document.querySelectorAll('.batch-info, .download-info, .info-table tr, .spe span');
      const info = [];
      infoElements.forEach(el => {
        info.push(el.textContent.trim());
      });
      return { title, info };
    });

    console.log(`\nPage title: ${pageInfo.title}`);
    console.log('Info elements:', pageInfo.info);

  } catch (error) {
    console.error('Error analyzing batch page:', error);
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

analyzeBatchPage();
