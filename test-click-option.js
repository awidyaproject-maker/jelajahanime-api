const { createOptimizedScrapingSession, navigateOptimized, cleanupBrowser } = require('./src/lib/puppeteer-optimized');

async function testClickOption() {
  console.log('Testing click option...');
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

    console.log('Page loaded, waiting for server options...');

    // Wait for server options
    await page.waitForSelector('#server ul li .east_player_option', { timeout: 15000 });
    console.log('Server options found');

    // Get the first option
    const optionHandles = await page.$$('#server ul li .east_player_option');
    console.log(`Found ${optionHandles.length} options`);

    if (optionHandles.length > 0) {
      // Try to find a Wibufile option instead of the first one
      let targetOption = optionHandles[0];
      let targetIndex = 0;

      for (let i = 0; i < optionHandles.length; i++) {
        const text = await optionHandles[i].evaluate(el => el.textContent?.trim() || '');
        if (text.includes('Wibufile')) {
          targetOption = optionHandles[i];
          targetIndex = i;
          console.log(`Found Wibufile option at index ${i}: ${text}`);
          break;
        }
      }

      // Get info about the target option
      const optionInfo = await targetOption.evaluate(el => ({
        text: el.textContent?.trim(),
        className: el.className,
        style: el.getAttribute('style'),
        dataset: Object.assign({}, el.dataset)
      }));

      console.log('Target option info:', optionInfo);

      // Check current iframe before clicking
      const initialIframeInfo = await page.evaluate(() => {
        const playerDiv = document.querySelector('#player_embed');
        const iframe = playerDiv?.querySelector('iframe');
        return {
          hasPlayerDiv: !!playerDiv,
          hasIframe: !!iframe,
          iframeSrc: iframe?.getAttribute('src') || null
        };
      });
      console.log('Initial iframe info:', initialIframeInfo);

      // Click the target option
      console.log(`Clicking target option (${targetIndex}): ${optionInfo.text}`);
      await targetOption.click({ delay: 75 });

      // Wait and check for iframe changes
      console.log('Waiting for iframe to change...');
      let newIframeSrc = null;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts && !newIframeSrc) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const currentIframeInfo = await page.evaluate(() => {
          const playerDiv = document.querySelector('#player_embed');
          const iframe = playerDiv?.querySelector('iframe');
          return {
            hasIframe: !!iframe,
            iframeSrc: iframe?.getAttribute('src') || null
          };
        });

        if (currentIframeInfo.iframeSrc && currentIframeInfo.iframeSrc !== initialIframeInfo.iframeSrc) {
          newIframeSrc = currentIframeInfo.iframeSrc;
          console.log(`✅ Found new iframe source: ${newIframeSrc.substring(0, 50)}...`);
          break;
        }

        attempts++;
        console.log(`Attempt ${attempts}: no iframe change found`);
      }

      if (!newIframeSrc) {
        console.log('❌ No video source found after clicking');

        // Check what changed after clicking
        const afterClickInfo = await page.evaluate(() => {
          const video = document.querySelector('video');
          const sources = document.querySelectorAll('video source');
          const iframes = document.querySelectorAll('iframe');
          const playerDiv = document.querySelector('#player_embed, #player, .player');

          return {
            hasVideo: !!video,
            sourceCount: sources.length,
            sources: Array.from(sources).map(s => s.getAttribute('src')),
            iframeCount: iframes.length,
            iframes: Array.from(iframes).map(iframe => ({
              src: iframe.getAttribute('src'),
              id: iframe.id,
              className: iframe.className
            })).slice(0, 3),
            hasPlayerDiv: !!playerDiv,
            playerDivId: playerDiv?.id || null,
            playerDivClass: playerDiv?.className || null,
            playerDivHtml: playerDiv ? playerDiv.innerHTML.substring(0, 200) : null
          };
        });

        console.log('After click info:', JSON.stringify(afterClickInfo, null, 2));
      }
    }

    console.log('Test completed');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await cleanupBrowser(browser, page);
  }
}

testClickOption();
