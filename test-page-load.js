const { createOptimizedScrapingSession, navigateOptimized, cleanupBrowser } = require('./src/lib/puppeteer-optimized');

async function testPageLoad() {
  console.log('Testing page load...');
  let browser = null;
  let page = null;

  try {
    console.log('Creating browser session...');
    const session = await createOptimizedScrapingSession({
      blockResources: false
    });
    browser = session.browser;
    page = session.page;

    const episodeUrl = 'https://v1.samehadaku.how/ninja-to-gokudou-episode-4/';
    console.log(`Navigating to: ${episodeUrl}`);

    await navigateOptimized(page, episodeUrl, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    console.log('Page loaded, checking content...');

    const title = await page.title();
    console.log('Page title:', title);

    const url = page.url();
    console.log('Current URL:', url);

    // Check for server options
    const debugInfo = await page.evaluate(() => {
      const serverContainer = document.querySelector('#server');
      const serverOptions = document.querySelectorAll('#server ul li .east_player_option');
      const allEastOptions = document.querySelectorAll('.east_player_option');

      return {
        hasServerContainer: !!serverContainer,
        serverOptionsCount: serverOptions.length,
        allEastOptionsCount: allEastOptions.length,
        serverOptionsText: Array.from(serverOptions).map(el => el.textContent?.trim()).slice(0, 5),
        allEastOptionsText: Array.from(allEastOptions).map(el => el.textContent?.trim()).slice(0, 5),
        pageTitle: document.title,
        url: window.location.href
      };
    });

    console.log('Debug info:', JSON.stringify(debugInfo, null, 2));

    console.log('Test completed successfully');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await cleanupBrowser(browser, page);
  }
}

testPageLoad();
