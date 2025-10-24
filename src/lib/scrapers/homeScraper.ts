import { load } from 'cheerio';
import { Anime, Genre } from '@/types/anime';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { SITE_CONFIG } from '../config';
import puppeteer, { Browser, Page } from 'puppeteer';

// Helper function to scrape featured
const scrapeFeatured = ($: any): Anime[] => {
  const featured: Anime[] = [];
  // Use .thumb selector yang ada di halaman Samehadaku
  $('div.thumb').each((_: any, el: any) => {
    const $el = $(el);
    const $link = $el.find('a').first();
    const href = $link.attr('href');
    const $img = $link.find('img');

    if (href) {
      featured.push({
        id: href.split('/').filter(Boolean).pop() || '',
        title: $img.attr('title') || $img.attr('alt') || '',
        image: $img.attr('src') || '',
        synopsis: '',
        status: 'ongoing',
        url: href,
      });
    }
  });
  return featured.slice(0, 10); // Limit to 10
};

// Helper function to scrape popular
const scrapePopular = ($: any): Anime[] => {
  const popular: Anime[] = [];
  $('div.thumb').each((_: any, el: any) => {
    const $el = $(el);
    const $link = $el.find('a').first();
    const href = $link.attr('href');
    const $img = $link.find('img');

    if (href) {
      popular.push({
        id: href.split('/').filter(Boolean).pop() || '',
        title: $img.attr('title') || $img.attr('alt') || '',
        image: $img.attr('src') || '',
        synopsis: '',
        status: 'ongoing',
        url: href,
      });
    }
  });
  return popular.slice(0, 10); // Limit to 10
};

// Helper function to scrape latest
const scrapeLatest = ($: any): Anime[] => {
  const latest: Anime[] = [];
  $('div.thumb').each((_: any, el: any) => {
    const $el = $(el);
    const $link = $el.find('a').first();
    const href = $link.attr('href');
    const $img = $link.find('img');

    if (href) {
      latest.push({
        id: href.split('/').filter(Boolean).pop() || '',
        title: $img.attr('title') || $img.attr('alt') || '',
        image: $img.attr('src') || '',
        synopsis: '',
        status: 'ongoing',
        url: href,
      });
    }
  });
  return latest.slice(0, 10); // Limit to 10
};

// Helper function to scrape airing
const scrapeAiring = ($: any): Anime[] => {
  const airing: Anime[] = [];
  $('div.thumb').each((_: any, el: any) => {
    const $el = $(el);
    const $link = $el.find('a').first();
    const href = $link.attr('href');
    const $img = $link.find('img');

    if (href) {
      airing.push({
        id: href.split('/').filter(Boolean).pop() || '',
        title: $img.attr('title') || $img.attr('alt') || '',
        image: $img.attr('src') || '',
        synopsis: '',
        status: 'ongoing',
        url: href,
      });
    }
  });
  return airing.slice(0, 10); // Limit to 10
};

export class HomeScraper {
  /**
   * Puppeteer-based scraping method for home page
   */
  private static async scrapeHomeWithPuppeteer(): Promise<string> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      console.log(`Launching Puppeteer browser for home page`);

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

      const homeUrl = `${SITE_CONFIG.BASE_URL}/`;
      console.log(`Navigating to home URL: ${homeUrl}`);

      // Navigate to the home page
      await page.goto(homeUrl, {
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
      console.log(`Home page content retrieved, length:`, content.length);

      return content;

    } catch (error) {
      console.error(`Puppeteer home page scraping failed:`, error);
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
   * Scrape Home Page
   */
  static async getHome() {
    const cacheKey = 'home:all';

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // Try Puppeteer first for better anti-detection and Cloudflare bypass
        console.log(`Attempting to scrape home page with Puppeteer`);
        const data = await this.scrapeHomeWithPuppeteer();
        const $ = load(data);

        return {
          featured: scrapeFeatured($),
          popular: scrapePopular($),
          latest: scrapeLatest($),
          airing: scrapeAiring($),
        };
      } catch (puppeteerError) {
        console.error('Puppeteer home scraping failed, falling back to axios:', puppeteerError);

        try {
          // Fallback to axios
          const { data } = await axiosInstance.get('/');
          const $ = load(data);

          return {
            featured: scrapeFeatured($),
            popular: scrapePopular($),
            latest: scrapeLatest($),
            airing: scrapeAiring($),
          };
        } catch (axiosError) {
          console.error('Axios home scraping also failed:', axiosError);
          throw new Error(`Failed to scrape home page: ${axiosError}`);
        }
      }
    });
  }

  /**
   * Get All Genres
   */
  static async getGenres() {
    const cacheKey = 'genres:all:v2';

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        const { data } = await axiosInstance.get('/');
        const $ = load(data);
        const genres: Genre[] = [];

        // Try multiple selectors for genres - expanded list
        const selectors = [
          '.genre-list a',
          '.genres a',
          'nav a[href*="/genre/"]',
          'a[href*="/genre/"]',
          '.menu-item a[href*="/genre/"]',
          'li a[href*="/genre/"]',
          '.navbar a[href*="/genre/"]',
          '.nav a[href*="/genre/"]',
          '.sidebar a[href*="/genre/"]',
          '.widget a[href*="/genre/"]',
          'aside a[href*="/genre/"]',
          '.category-list a[href*="/genre/"]',
          '.tag-list a[href*="/genre/"]'
        ];

        for (const selector of selectors) {
          $(selector).each((_, el) => {
            const $el = $(el);
            const href = $el.attr('href');
            const text = $el.text().trim();

            if (href && href.includes('/genre/') && text && !genres.find(g => g.id === href.split('/').filter(Boolean).pop())) {
              genres.push({
                id: href.split('/').filter(Boolean).pop() || '',
                name: text,
                url: href,
              });
            }
          });

          if (genres.length > 0) break; // Stop if we found genres
        }

        // Always include additional common genres that users expect
        const additionalGenres = [
          { id: 'shounen', name: 'Shounen', url: `${SITE_CONFIG.BASE_URL}/genre/shounen/` },
          { id: 'isekai', name: 'Isekai', url: `${SITE_CONFIG.BASE_URL}/genre/isekai/` },
          { id: 'seinen', name: 'Seinen', url: `${SITE_CONFIG.BASE_URL}/genre/seinen/` },
          { id: 'reincarnation', name: 'Reincarnation', url: `${SITE_CONFIG.BASE_URL}/genre/reincarnation/` },
          { id: 'mystery', name: 'Mystery', url: `${SITE_CONFIG.BASE_URL}/genre/mystery/` },
          { id: 'historical', name: 'Historical', url: `${SITE_CONFIG.BASE_URL}/genre/historical/` },
          { id: 'harem', name: 'Harem', url: `${SITE_CONFIG.BASE_URL}/genre/harem/` },
          { id: 'ecchi', name: 'Ecchi', url: `${SITE_CONFIG.BASE_URL}/genre/ecchi/` },
          { id: 'slice-of-life', name: 'Slice of Life', url: `${SITE_CONFIG.BASE_URL}/genre/slice-of-life/` }
        ];

        // Merge scraped genres with additional genres, avoiding duplicates
        for (const genre of additionalGenres) {
          if (!genres.find(g => g.id === genre.id)) {
            genres.push(genre);
          }
        }

        return genres;
      } catch (error) {
        console.error('Error scraping genres:', error);
        // Return comprehensive fallback genres list
        return [
          { id: 'action', name: 'Action', url: `${SITE_CONFIG.BASE_URL}/genre/action/` },
          { id: 'adventure', name: 'Adventure', url: `${SITE_CONFIG.BASE_URL}/genre/adventure/` },
          { id: 'comedy', name: 'Comedy', url: `${SITE_CONFIG.BASE_URL}/genre/comedy/` },
          { id: 'drama', name: 'Drama', url: `${SITE_CONFIG.BASE_URL}/genre/drama/` },
          { id: 'fantasy', name: 'Fantasy', url: `${SITE_CONFIG.BASE_URL}/genre/fantasy/` },
          { id: 'romance', name: 'Romance', url: `${SITE_CONFIG.BASE_URL}/genre/romance/` },
          { id: 'sci-fi', name: 'Sci-Fi', url: `${SITE_CONFIG.BASE_URL}/genre/sci-fi/` },
          { id: 'school', name: 'School', url: `${SITE_CONFIG.BASE_URL}/genre/school/` },
          { id: 'super-power', name: 'Super Power', url: `${SITE_CONFIG.BASE_URL}/genre/super-power/` },
          { id: 'sports', name: 'Sports', url: `${SITE_CONFIG.BASE_URL}/genre/sports/` },
          { id: 'supernatural', name: 'Supernatural', url: `${SITE_CONFIG.BASE_URL}/genre/supernatural/` },
          { id: 'teamsports', name: 'TeamSports', url: `${SITE_CONFIG.BASE_URL}/genre/teamsports/` },
          { id: 'team', name: 'Team', url: `${SITE_CONFIG.BASE_URL}/genre/team/` },
          // Additional genres requested by user
          { id: 'shounen', name: 'Shounen', url: `${SITE_CONFIG.BASE_URL}/genre/shounen/` },
          { id: 'isekai', name: 'Isekai', url: `${SITE_CONFIG.BASE_URL}/genre/isekai/` },
          { id: 'seinen', name: 'Seinen', url: `${SITE_CONFIG.BASE_URL}/genre/seinen/` },
          { id: 'reincarnation', name: 'Reincarnation', url: `${SITE_CONFIG.BASE_URL}/genre/reincarnation/` },
          { id: 'mystery', name: 'Mystery', url: `${SITE_CONFIG.BASE_URL}/genre/mystery/` },
          { id: 'historical', name: 'Historical', url: `${SITE_CONFIG.BASE_URL}/genre/historical/` },
          { id: 'harem', name: 'Harem', url: `${SITE_CONFIG.BASE_URL}/genre/harem/` },
          { id: 'ecchi', name: 'Ecchi', url: `${SITE_CONFIG.BASE_URL}/genre/ecchi/` },
          { id: 'slice-of-life', name: 'Slice of Life', url: `${SITE_CONFIG.BASE_URL}/genre/slice-of-life/` }
        ];
      }
    });
  }
}