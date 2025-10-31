import { load } from 'cheerio';
import { Anime } from '@/types/anime';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { SITE_CONFIG } from '../config';
import puppeteer, { Browser, Page } from 'puppeteer';
import { scrapeAnimeItems } from './baseScraper';

export class AiringScraper {
  /**
   * Get Airing Anime
   */
  static async getAiringAnime(page: number = 1, limit: number = 20) {
    const cacheKey = `anime:airing:page:${page}:limit:${limit}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // Try Puppeteer first for better anti-detection and Cloudflare bypass
        const animes = await this.scrapeAiringWithPuppeteer(page);

        return {
          data: animes,
          pagination: {
            currentPage: page,
            totalPages: 50,
            totalItems: 1000,
          }
        };
      } catch (puppeteerError) {
        console.error('Puppeteer airing scraping failed, falling back to axios:', puppeteerError);

        try {
          // Fallback to axios with advanced headers
          const response = await axiosInstance.get('/anime-terbaru/');
          const $ = load(response.data);
          const animes = scrapeAnimeItems($);

          return {
            data: animes.slice(0, limit),
            pagination: {
              currentPage: page,
              totalPages: 50,
              totalItems: 1000,
            }
          };
        } catch (axiosError) {
          console.error('Axios airing scraping also failed:', axiosError);
          throw new Error(`Failed to scrape airing anime: ${axiosError}`);
        }
      }
    });
  }

  /**
   * Puppeteer-based scraping method for airing anime
   */
  private static async scrapeAiringWithPuppeteer(pageNum: number = 1): Promise<Anime[]> {
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

      const airingUrl = pageNum === 1 
        ? `${SITE_CONFIG.BASE_URL}/daftar-anime-2/?title&status=Currently+Airing&type&order=update`
        : `${SITE_CONFIG.BASE_URL}/daftar-anime-2/page/${pageNum}/?title&status=Currently+Airing&type&order=update`;

      // Navigate to the airing anime page
      await page.goto(airingUrl, {
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

      // Scroll to bottom to ensure all content is loaded
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the page content
      const content = await page.content();

      // Parse with Cheerio
      const $ = load(content);

      // Extract anime items
      const animes = scrapeAnimeItems($);

      // Remove duplicates based on id
      const uniqueAnimes = Array.from(new Map(animes.map(anime => [anime.id, anime])).values());

      return uniqueAnimes;

    } catch (error) {
      console.error(`Puppeteer airing anime scraping failed:`, error);
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