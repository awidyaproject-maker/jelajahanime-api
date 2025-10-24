import { load } from 'cheerio';
import { Anime } from '@/types/anime';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { SITE_CONFIG } from '../config';
import puppeteer, { Browser, Page } from 'puppeteer';

// Helper function to scrape anime items from .thumb elements or article tags
const scrapeAnimeItems = ($: any, container?: string): any[] => {
  const items: any[] = [];

  // Try different selectors
  let $items = $('div.thumb');

  // If no thumb elements found, try article tags (for search results, etc)
  if ($items.length === 0) {
    $items = $('article.animpost, div.animepost');
  }

  $items.each((_: any, el: any) => {
    const $el = $(el);
    const $link = $el.find('a').first();
    const href = $link.attr('href');
    const $img = $link.find('img');

    if (href) {
      items.push({
        id: href.split('/').filter(Boolean).pop() || '',
        title: $img.attr('title') || $img.attr('alt') || '',
        image: $img.attr('src') || '',
        synopsis: '',
        status: 'ongoing',
        url: href,
      });
    }
  });

  return items;
};

// Helper function to scrape movie items from .animpost or similar
const scrapeMovieItems = ($: any): any[] => {
  const items: any[] = [];

  // Look for movie links - try multiple approaches
  $('a').each((_: any, el: any) => {
    const $el = $(el);
    const href = $el.attr('href');
    const text = $el.text().trim();

    // Check if this looks like a movie link
    if (href && href.includes('/anime/') && (text.includes('MOVIE') || text.includes('Completed'))) {
      // Try to extract title - look for patterns like [Title MOVIE ... Completed]
      let title = '';
      if (text.startsWith('[') && text.endsWith(']')) {
        const content = text.slice(1, -1);
        const movieIndex = content.indexOf(' MOVIE ');
        if (movieIndex !== -1) {
          title = content.substring(0, movieIndex).trim();
        } else {
          // Fallback: remove "Completed" and clean up
          title = content.replace(' Completed', '').trim();
        }
      } else {
        // Fallback for different formats
        title = text.replace(' MOVIE', '').replace(' Completed', '').trim();
      }

      // Clean up title by removing "Movie" prefix and rating patterns
      if (title.startsWith('Movie ')) {
        title = title.substring(6); // Remove "Movie " prefix
      }
      // Remove rating pattern like "7.45Title" -> "Title"
      title = title.replace(/^[\d.]+\s*/, '');
      // Remove "Completed" suffix
      title = title.replace(/\s*Completed\s*$/, '');

      if (title) {
        // Get image if available
        let image = '';
        const $img = $el.find('img').first();
        if ($img.length > 0) {
          image = $img.attr('src') || $img.attr('data-src') || '';
        }

        items.push({
          id: href.split('/').filter(Boolean).pop() || '',
          title: title,
          image: image,
          synopsis: '',
          status: 'completed',
          url: href,
        });
      }
    }
  });

  return items;
};

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
    });
  }

  /**
   * Get Latest Anime
   */
  static async getLatestAnime(limit: number = 20, page: number = 1) {
    const cacheKey = `anime:latest:page:${page}:limit:${limit}:v5`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // Scrape only the requested page using Puppeteer
        console.log(`Scraping latest anime page ${page} with limit ${limit}`);
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
          console.log('Attempting axios fallback for latest anime page', page);
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
    });
  }

  /**
   * Puppeteer-based scraping method for latest anime
   */
  private static async scrapeLatestWithPuppeteer(pageNum: number = 1): Promise<any[]> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      console.log(`Launching Puppeteer browser for latest anime page: ${pageNum}`);

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
      console.log(`Navigating to latest anime URL: ${latestUrl}`);

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
      console.log(`Latest anime page ${pageNum} content retrieved, length:`, content.length);

      // Parse with Cheerio
      const $ = load(content);

      // Extract anime items
      const animes = scrapeAnimeItems($);
      console.log(`Found ${animes.length} anime on page ${pageNum}`);

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
  static async getAllLatestAnime(): Promise<any[]> {
    const cacheKey = 'anime:latest:all:v2'; // Updated version to invalidate old cache

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        const allAnimes: any[] = [];

        // Try to get data from multiple pages using Puppeteer
        const maxPages = 20; // Limit to 20 pages to avoid excessive scraping

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          try {
            console.log(`Scraping latest anime page ${pageNum}...`);
            const animes = await this.scrapeLatestWithPuppeteer(pageNum);

            // Add new animes that aren't already in the list
            let newAnimeCount = 0;
            for (const anime of animes) {
              if (!allAnimes.find(a => a.id === anime.id)) {
                allAnimes.push(anime);
                newAnimeCount++;
              }
            }

            console.log(`Added ${newAnimeCount} new anime from page ${pageNum}`);

            // If we got fewer than expected results or no new anime, we might be at the end
            if (animes.length < 10 || newAnimeCount === 0) {
              console.log(`Stopping at page ${pageNum} - insufficient new content`);
              break;
            }

            // If we have enough data, we can stop
            if (allAnimes.length >= 400) {
              console.log(`Reached target of ${allAnimes.length} anime, stopping collection`);
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

        console.log(`Total unique latest anime collected: ${allAnimes.length}`);
        return allAnimes;
      } catch (error) {
        console.error('Failed to get all latest anime with Puppeteer:', error);

        // Fallback to axios method if Puppeteer completely fails
        try {
          console.log('Attempting fallback to axios method...');
          const allAnimes: any[] = [];

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
            } catch (sourceError) {
              // Continue to next source if this one fails
              continue;
            }
          }

          console.log(`Fallback method collected ${allAnimes.length} anime`);
          return allAnimes;
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError);
          // Return empty array as final fallback
          return [];
        }
      }
    });
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
    });
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
    });
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
    });
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
    });
  }

  /**
   * Puppeteer-based scraping method for anime search
   */
  private static async scrapeSearchWithPuppeteer(query: string, pageNum: number = 1): Promise<{query: string, results: any[], pagination: any}> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      console.log(`Launching Puppeteer browser for anime search: ${query}`);

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
      console.log(`Navigating to search URL: ${searchUrl}`);

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
      console.log('Search page content retrieved, length:', content.length);

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
        console.log(`Attempting to search anime with Puppeteer: ${query}`);
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
    });
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
    });
  }
}