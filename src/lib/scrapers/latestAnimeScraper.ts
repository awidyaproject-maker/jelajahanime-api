import { load } from 'cheerio';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { SITE_CONFIG } from '../config';
import puppeteer, { Browser, Page } from 'puppeteer';
import { scrapeAnimeItems } from './baseScraper';
import { Anime } from '@/types/anime';

export class LatestAnimeScraper {
  /**
   * Get Latest Anime
   */
  static async getLatestAnime(limit: number = 20, page: number = 1) {
    const cacheKey = `anime:latest:page:${page}:limit:${limit}:v7`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // Use Puppeteer for all pages since the site blocks direct axios requests
        const animes = await this.scrapeLatestWithPuppeteer(page);
        return {
          data: animes.slice(0, limit),
          pagination: {
            currentPage: page,
            totalPages: 50, // Estimated
            totalItems: Math.max(animes.length, limit * 50),
          }
        };
      } catch (error) {
        // Fallback: try to get all latest anime and slice based on page
        try {
          console.warn(`Puppeteer failed for page ${page}, falling back to all-anime approach`);
          const allAnimes = await this.getAllLatestAnime();
          const startIndex = (page - 1) * limit;
          const endIndex = startIndex + limit;

          return {
            data: allAnimes.slice(startIndex, endIndex),
            pagination: {
              currentPage: page,
              totalPages: Math.ceil(allAnimes.length / limit),
              totalItems: allAnimes.length,
            }
          };
        } catch (fallbackError) {
          throw new Error(`Failed to scrape latest anime: ${error}. Fallback also failed: ${fallbackError}`);
        }
      }
    });
  }

  /**
   * Get All Latest Anime (helper method to collect as much data as possible)
   */
  static async getAllLatestAnime(): Promise<Anime[]> {
    const cacheKey = 'anime:latest:all:v2'; // Updated version to invalidate old cache

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        const allAnimes: Anime[] = [];

        // Try to get data from multiple pages using Puppeteer
        const maxPages = 20; // Limit to 20 pages to avoid excessive scraping

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          try {
            const animes = await this.scrapeLatestWithPuppeteer(pageNum);

            // Add new animes that aren't already in the list
            let newAnimeCount = 0;
            for (const anime of animes) {
              if (!allAnimes.find(a => a.id === anime.id)) {
                allAnimes.push(anime);
                newAnimeCount++;
              }
            }

            // If we got fewer than expected results or no new anime, we might be at the end
            if (animes.length < 10 || newAnimeCount === 0) {
              break;
            }

            // If we have enough data, we can stop
            if (allAnimes.length >= 400) {
              break;
            }

            // Add a small delay between pages to be respectful
            await new Promise(resolve => setTimeout(resolve, 1000));

          } catch {
            // Continue to next page if this one fails
            continue;
          }
        }

        return allAnimes;
      } catch {
        // Fallback to axios method if Puppeteer completely fails
        try {
          const allAnimes: Anime[] = [];

          // Try to get data from multiple pages/sources using axios
          const sources = [
            '/anime-terbaru/',
            '/anime-terbaru/page/2/',
            '/anime-terbaru/page/3/',
            '/anime-terbaru/page/4/',
            '/anime-terbaru/page/5/',
          ];

          for (const source of sources) {
            try {
              const { data } = await axiosInstance.get(source);
              const $ = load(data);
              const animes = scrapeAnimeItems($);

              // Add new animes that aren't already in the list
              for (const anime of animes) {
                if (!allAnimes.find(a => a.id === anime.id)) {
                  allAnimes.push(anime);
                }
              }

              // If we have enough data, we can stop
              if (allAnimes.length >= 100) {
                break;
              }
            } catch {
              // Continue to next source if this one fails
              continue;
            }
          }

          return allAnimes;
        } catch {
          // Return empty array as final fallback
          return [];
        }
      }
    });
  }

  /**
   * Puppeteer-based scraping method for latest anime
   */
  private static async scrapeLatestWithPuppeteer(pageNum: number = 1): Promise<Anime[]> {
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

      const latestUrl = pageNum === 1 ? `${SITE_CONFIG.BASE_URL}/anime-terbaru/` : `${SITE_CONFIG.BASE_URL}/anime-terbaru/page/${pageNum}/`;

      // Navigate to the latest anime page
      await page.goto(latestUrl, {
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

      // Extract anime items
      const animes = scrapeAnimeItems($);

      return animes;

    } catch (error) {
      console.error(`Puppeteer latest anime scraping failed for page ${pageNum}:`, error);
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
