import { load } from 'cheerio';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { SITE_CONFIG } from '../config';
import puppeteer, { Browser, Page } from 'puppeteer';
import { scrapeAnimeItems } from './baseScraper';
import { Anime } from '@/types/anime';

export class MovieScraper {
  /**
   * Get Anime Movies
   */
  static async getMovies(page: number = 1, limit: number = 50) {
    const cacheKey = `anime:movies:page:${page}:limit:${limit}:real:v3`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // Try Puppeteer first for better anti-detection and Cloudflare bypass
        const animes = await this.scrapeMoviesWithPuppeteer(page);

        return {
          data: animes.slice(0, limit),
          pagination: {
            currentPage: page,
            totalPages: 20,
            totalItems: animes.length > 0 ? animes.length * 20 : 400,
          }
        };
      } catch (puppeteerError) {
        console.error('Puppeteer movies scraping failed, falling back to axios:', puppeteerError);

        try {
          // Fallback to axios with advanced headers
          const url = page === 1 ? '/anime-movie/' : `/anime-movie/page/${page}/`;
          const { data } = await axiosInstance.get(url);
          const $ = load(data);

          const animes = scrapeAnimeItems($);

          return {
            data: animes.slice(0, limit),
            pagination: {
              currentPage: page,
              totalPages: 20,
              totalItems: animes.length > 0 ? animes.length * 20 : 400,
            }
          };
        } catch (axiosError) {
          console.error('Axios movies scraping also failed:', axiosError);
          throw new Error(`Failed to scrape movies: ${axiosError}`);
        }
      }
    });
  }

  /**
   * Puppeteer-based scraping method for movies
   */
  private static async scrapeMoviesWithPuppeteer(pageNum: number = 1): Promise<Anime[]> {
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

      const moviesUrl = pageNum === 1
        ? `${SITE_CONFIG.BASE_URL}/daftar-anime-2/?title=&status=&type=Movie&order=update`
        : `${SITE_CONFIG.BASE_URL}/daftar-anime-2/page/${pageNum}/?title=&status=&type=Movie&order=update`;

      // Navigate to the movies page
      await page.goto(moviesUrl, {
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
      const animes = scrapeAnimeItems($).map(anime => ({ ...anime, status: 'completed' as const }));

      // Remove duplicates based on id
      const uniqueAnimes = Array.from(new Map(animes.map(anime => [anime.id, anime])).values());

      return uniqueAnimes;

    } catch (error) {
      console.error(`Puppeteer movies scraping failed:`, error);
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