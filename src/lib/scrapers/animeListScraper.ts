import { load } from 'cheerio';
import { Anime } from '@/types/anime';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { SITE_CONFIG, getCacheTTL } from '../config';
import puppeteer, { Browser, Page } from 'puppeteer';
import { scrapeAnimeItems, scrapeMovieItems } from './baseScraper';

export class AnimeListScraper {
  /**
   * Get All Anime with Pagination
   */
  static async getAllAnime(page: number = 1, limit: number = 20) {
    const cacheKey = `anime:all:page:${page}:limit:${limit}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        const { data } = await axiosInstance.get(`/?page=${page}`);
        const $ = load(data);

        const animes = scrapeAnimeItems($);

        return {
          data: animes.slice(0, limit),
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(2000 / limit),
            totalItems: 2000,
          }
        };
      } catch (error) {
        throw new Error(`Failed to scrape all anime: ${error}`);
      }
    }, getCacheTTL('REGULAR') / 1000); // Convert to seconds for cache manager
  }

  /**
   * Get Latest Anime
   */
  static async getLatestAnime(limit: number = 20, page: number = 1) {
    const cacheKey = `anime:latest:page:${page}:limit:${limit}:v5`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // Scrape only the requested page using Puppeteer
        const animes = await this.scrapeLatestWithPuppeteer(page);

        // Apply limit to the results from this page
        const limitedData = animes.slice(0, limit);

        return {
          data: limitedData,
          pagination: {
            currentPage: page,
            totalPages: 50, // Estimated, since we don't know the actual total
            totalItems: animes.length > limit ? animes.length : limit * 50, // Rough estimate
          }
        };
      } catch (error) {
        console.error(`Failed to scrape latest anime for page ${page}:`, error);

        // Fallback to axios method
        try {
          const latestUrl = page === 1 ? '/anime-terbaru/' : `/anime-terbaru/page/${page}/`;
          const { data } = await axiosInstance.get(latestUrl);
          const $ = load(data);
          const animes = scrapeAnimeItems($);

          return {
            data: animes.slice(0, limit),
            pagination: {
              currentPage: page,
              totalPages: 50,
              totalItems: 1000,
            }
          };
        } catch (fallbackError) {
          console.error('Axios fallback also failed:', fallbackError);
          throw new Error(`Failed to scrape latest anime: ${error}`);
        }
      }
    }, getCacheTTL('FREQUENT') / 1000); // Latest anime updates frequently
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

          } catch (pageError) {
            console.error(`Failed to scrape page ${pageNum}:`, pageError);
            // Continue to next page if this one fails
            continue;
          }
        }

        return allAnimes;
      } catch (error) {
        console.error('Failed to get all latest anime with Puppeteer:', error);

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
            } catch (_sourceError) { // eslint-disable-line @typescript-eslint/no-unused-vars
              // Continue to next source if this one fails
              continue;
            }
          }

          return allAnimes;
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
          // Return empty array as final fallback
          return [];
        }
      }
    }, getCacheTTL('FREQUENT') / 1000); // Latest anime collection updates frequently
  }

  /**
   * Get Airing Anime
   */
  static async getAiringAnime(page: number = 1, limit: number = 20) {
    const cacheKey = `anime:airing:page:${page}:limit:${limit}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // Try specific airing/latest URL first
        let data;
        try {
          const response = await axiosInstance.get('/anime-terbaru/');
          data = response.data;
        } catch (airingError) {
          // Fallback to homepage if airing URL fails
          console.warn('Airing URL failed, using homepage fallback:', airingError);
          const response = await axiosInstance.get('/');
          data = response.data;
        }

        const $ = load(data);
        const animes = scrapeAnimeItems($);

        return {
          data: animes.slice(0, limit),
          pagination: {
            currentPage: page,
            totalPages: 50,
            totalItems: 1000,
          }
        };
      } catch (error) {
        throw new Error(`Failed to scrape airing anime: ${error}`);
      }
    }, getCacheTTL('FREQUENT') / 1000); // Airing anime updates frequently
  }

  /**
   * Get Completed Anime
   */
  static async getCompletedAnime(page: number = 1, limit: number = 20) {
    const cacheKey = `anime:completed:page:${page}:limit:${limit}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // Try specific completed URL first
        let data;
        try {
          const response = await axiosInstance.get('/anime/complete/');
          data = response.data;
        } catch (completedError) {
          // Fallback to homepage if completed URL fails
          console.warn('Completed URL failed, using homepage fallback:', completedError);
          const response = await axiosInstance.get('/');
          data = response.data;
        }

        const $ = load(data);
        const animes = scrapeAnimeItems($);

        return {
          data: animes.slice(0, limit),
          pagination: {
            currentPage: page,
            totalPages: 30,
            totalItems: 600,
          }
        };
      } catch (error) {
        throw new Error(`Failed to scrape completed anime: ${error}`);
      }
    }, getCacheTTL('OCCASIONAL') / 1000); // Completed anime updates occasionally
  }

  /**
   * Get Popular Anime
   */
  static async getPopularAnime(limit: number = 20) {
    const cacheKey = `anime:popular:${limit}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        const { data } = await axiosInstance.get('/');
        const $ = load(data);

        const animes = scrapeAnimeItems($);

        return animes.slice(0, limit);
      } catch (error) {
        throw new Error(`Failed to scrape popular anime: ${error}`);
      }
    }, getCacheTTL('REGULAR') / 1000); // Popular anime updates regularly
  }

  /**
   * Get Anime Movies
   */
  static async getMovies(page: number = 1, limit: number = 20) {
    const cacheKey = `anime:movies:page:${page}:limit:${limit}:real:v3`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        const url = page === 1 ? '/anime-movie/' : `/anime-movie/page/${page}/`;
        const { data } = await axiosInstance.get(url);
        const $ = load(data);

        const animes = scrapeMovieItems($);

        return {
          data: animes.slice(0, limit),
          pagination: {
            currentPage: page,
            totalPages: 20,
            totalItems: animes.length > 0 ? animes.length * 20 : 400,
          }
        };
      } catch (error) {
        console.error('Error scraping movies:', error);
        // Return some fallback data
        return {
          data: [
            {
              id: 'fallback-movie-1',
              title: 'Fallback Movie 1',
              image: 'https://via.placeholder.com/200x300?text=Fallback',
              synopsis: 'Fallback data due to scraping error',
              status: 'completed',
              url: 'https://example.com/fallback',
            }
          ],
          pagination: {
            currentPage: page,
            totalPages: 1,
            totalItems: 1,
          }
        };
      }
    }, getCacheTTL('OCCASIONAL') / 1000); // Movies update occasionally
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
   * Get Anime by Genre
   */
  static async getAnimeByGenre(genre: string, page: number = 1, limit: number = 20) {
    const cacheKey = `anime:genre:${genre}:page:${page}:limit:${limit}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // Try specific genre URL first
        let data;
        try {
          const genreUrl = page === 1 ? `/genre/${genre}/` : `/genre/${genre}/page/${page}/`;
          const response = await axiosInstance.get(genreUrl);
          data = response.data;
        } catch (genreError) {
          // Fallback to homepage if genre URL fails
          console.warn(`Genre URL /genre/${genre}/ failed, using homepage fallback:`, genreError);
          const response = await axiosInstance.get('/');
          data = response.data;
        }

        const $ = load(data);
        const animes = scrapeAnimeItems($);

        return {
          data: animes.slice(0, limit),
          genre,
          pagination: {
            currentPage: page,
            totalPages: 20,
            totalItems: 400,
          }
        };
      } catch (error) {
        throw new Error(`Failed to scrape anime by genre: ${error}`);
      }
    }, getCacheTTL('STATIC') / 1000); // Genre listings are static content
  }
}