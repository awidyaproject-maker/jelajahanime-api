import { load } from 'cheerio';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { SITE_CONFIG, getCacheTTL } from '../config';
import puppeteer, { Browser, Page } from 'puppeteer';
import { scrapeAnimeItems } from './baseScraper';
import { Anime } from '@/types/anime';

export class SearchScraper {
  /**
   * Search Anime
   */
  static async searchAnime(query: string, page: number = 1) {
    const cacheKey = `anime:search:${query}:${page}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // Try Puppeteer first for better anti-detection and Cloudflare bypass
        return await this.scrapeSearchWithPuppeteer(query, page);
      } catch (puppeteerError) {
        console.error('Puppeteer search scraping failed, falling back to axios:', puppeteerError);

        try {
          // Fallback to axios with advanced headers
          const { data } = await axiosInstance.get(`/?s=${encodeURIComponent(query)}`);
          const $ = load(data);

          const animes = scrapeAnimeItems($);

          return {
            query,
            results: animes,
            pagination: {
              currentPage: page,
              totalPages: 10,
              totalItems: 200,
            }
          };
        } catch (axiosError) {
          console.error('Axios search scraping also failed:', axiosError);
          throw new Error(`Failed to search anime: ${axiosError}`);
        }
      }
    }, getCacheTTL('DYNAMIC') / 1000); // Search results are very dynamic
  }

  /**
   * Puppeteer-based scraping method for anime search
   */
  private static async scrapeSearchWithPuppeteer(query: string, pageNum: number = 1): Promise<{query: string, results: Anime[], pagination: {currentPage: number, totalPages: number, totalItems: number}}> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      // Launch browser with stealth options
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
        ]
      });

      page = await browser.newPage();

      // Set realistic viewport
      await page.setViewport({ width: 1366, height: 768 });

      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');

      // Set extra HTTP headers
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      const searchUrl = `${SITE_CONFIG.BASE_URL}/?s=${encodeURIComponent(query)}`;

      // Navigate to the search page
      await page.goto(searchUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait a bit for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Scroll down to load more content
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the page content
      const content = await page.content();

      // Parse with Cheerio
      const $ = load(content);

      // Extract search results
      const animes = scrapeAnimeItems($);

      return {
        query,
        results: animes,
        pagination: {
          currentPage: pageNum,
          totalPages: 10,
          totalItems: animes.length > 0 ? animes.length * 10 : 200,
        }
      };

    } catch (error) {
      console.error('Puppeteer search scraping failed:', error);
      throw error;
    } finally {
      // Clean up browser
      if (page) {
        try {
          await page.close();
        } catch (e) {
          console.error('Error closing page:', e);
        }
      }
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.error('Error closing browser:', e);
        }
      }
    }
  }
}