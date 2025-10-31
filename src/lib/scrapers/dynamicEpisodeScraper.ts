import { Browser, Page } from 'puppeteer';
import { createOptimizedScrapingSession, navigateOptimized, cleanupBrowser } from '../puppeteer-optimized';
import { SITE_CONFIG } from '../config';
import { collectVideoSourcesFromPlayerOptions } from './episodeScraper';
import { EpisodeData } from '@/types/anime';

async function extractEpisodeMetadata(page: Page): Promise<import('@/types/anime').EpisodeMetadata> {
  try {
    const metadata = await page.evaluate(() => {
      // Extract title from h1.entry-title
      const titleElement = document.querySelector('h1.entry-title');
      const title = titleElement?.textContent?.trim() || null;

      // Extract description from div.entry-content.entry-content-single
      const descriptionElement = document.querySelector('div.entry-content.entry-content-single');
      const description = descriptionElement?.textContent?.trim() || null;

      // Extract episode number from span[itemprop="episodeNumber"]
      const episodeNumberElement = document.querySelector('span[itemprop="episodeNumber"]');
      const episode_number = episodeNumberElement?.textContent?.trim() || null;

      // Extract subtitle language from span.lg inside span.epx
      const subtitleLanguageElement = document.querySelector('span.epx span.lg');
      const subtitle_language = subtitleLanguageElement?.textContent?.trim() || null;

      // Extract release time from span.time-post
      const releaseTimeElement = document.querySelector('span.time-post');
      const release_time = releaseTimeElement?.textContent?.trim() || null;

      return {
        title,
        description,
        episode_number,
        subtitle_language,
        release_time
      };
    });

    console.log('📋 Extracted metadata:', metadata);
    return metadata;
  } catch (error) {
    console.error('❌ Error extracting metadata:', error);
    return {
      title: null,
      description: null,
      episode_number: null,
      subtitle_language: null,
      release_time: null
    };
  }
}

export class DynamicEpisodeScraper {
  static async scrape(episodeSlug: string): Promise<EpisodeData> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      console.log(`🔍 Starting dynamic scrape for: ${episodeSlug}`);

      const session = await createOptimizedScrapingSession({
        blockResources: false
      });
      browser = session.browser;
      page = session.page;

      const episodeUrl = `${SITE_CONFIG.BASE_URL}/${episodeSlug}/`;
      console.log(`🌐 Navigating to: ${episodeUrl}`);

      await navigateOptimized(page, episodeUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      console.log('✅ Page loaded, extracting metadata...');

      // Extract episode metadata
      const metadata = await extractEpisodeMetadata(page);

      // Debug: Check what elements exist on the page
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

      console.log('🔍 Debug info:', debugInfo);

      // Wait for the server options to load
      try {
        await page.waitForSelector('#server ul li .east_player_option', { timeout: 15000 });
        console.log('✅ Server options found');
      } catch {
        console.log('⚠️ Server options not found within timeout, trying fallback selector...');

        // Try fallback selector
        try {
          await page.waitForSelector('.east_player_option', { timeout: 5000 });
          console.log('✅ Found east_player_option elements with fallback selector');
        } catch {
          console.log('⚠️ No east_player_option elements found at all');
          return {
            ...metadata,
            servers: []
          };
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1200));

      // Extract video sources directly from player options
      console.log('🎬 Starting video source extraction...');
      const servers = await collectVideoSourcesFromPlayerOptions(page);

      console.log(`✅ Extracted ${servers.length} video sources from player options`);

      return {
        ...metadata,
        servers
      };
    } catch (error) {
      console.error(`❌ Error scraping ${episodeSlug}:`, error);
      return {
        title: null,
        description: null,
        episode_number: null,
        subtitle_language: null,
        release_time: null,
        servers: []
      };
    } finally {
      await cleanupBrowser(browser, page);
    }
  }
}
