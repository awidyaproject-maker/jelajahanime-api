import { load } from 'cheerio';
import { Anime, Genre } from '@/types/anime';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { SITE_CONFIG } from '../config';
import puppeteer, { Browser, Page } from 'puppeteer';

// Helper function to scrape featured
const scrapeFeatured = ($: any): Anime[] => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const featured: Anime[] = [];
  // Use .thumb selector yang ada di halaman Samehadaku
  $('div.thumb').each((_: any, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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
const scrapePopular = ($: any): Anime[] => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const popular: Anime[] = [];
  $('div.thumb').each((_: any, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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
const scrapeLatest = ($: any): Anime[] => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const latest: Anime[] = [];
  $('div.thumb').each((_: any, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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
const scrapeAiring = ($: any): Anime[] => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const airing: Anime[] = [];
  $('div.thumb').each((_: any, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
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
          console.error('Axios home scraping also failed, using mock data:', axiosError);

          // Return mock data as final fallback
          return this.getMockHomeData();
        }
      }
    });
  }

  /**
   * Get Mock Home Data for Development/Testing
   */
  private static getMockHomeData() {
    console.log('Using mock home data due to site accessibility issues');

    return {
      featured: [
        {
          id: 'demo-featured-1',
          title: 'Demo Featured Anime 1',
          image: 'https://via.placeholder.com/300x400/FF6B6B/FFFFFF?text=Featured+1',
          synopsis: 'This is a demo featured anime entry. The actual site is currently blocking automated requests.',
          status: 'ongoing',
          url: 'https://example.com/demo-featured-1',
          rating: 8.5,
          genres: ['Action', 'Adventure']
        },
        {
          id: 'demo-featured-2',
          title: 'Demo Featured Anime 2',
          image: 'https://via.placeholder.com/300x400/4ECDC4/FFFFFF?text=Featured+2',
          synopsis: 'Another demo featured anime entry for testing purposes.',
          status: 'ongoing',
          url: 'https://example.com/demo-featured-2',
          rating: 9.0,
          genres: ['Fantasy', 'Romance']
        }
      ],
      popular: [
        {
          id: 'demo-popular-1',
          title: 'Demo Popular Anime 1',
          image: 'https://via.placeholder.com/200x300/45B7D1/FFFFFF?text=Popular+1',
          synopsis: 'Demo popular anime entry.',
          status: 'completed',
          url: 'https://example.com/demo-popular-1'
        },
        {
          id: 'demo-popular-2',
          title: 'Demo Popular Anime 2',
          image: 'https://via.placeholder.com/200x300/96CEB4/FFFFFF?text=Popular+2',
          synopsis: 'Another demo popular anime entry.',
          status: 'ongoing',
          url: 'https://example.com/demo-popular-2'
        }
      ],
      latest: [
        {
          id: 'demo-latest-1',
          title: 'Demo Latest Anime 1 - Episode 12',
          image: 'https://via.placeholder.com/200x300/FECA57/FFFFFF?text=Latest+1',
          synopsis: 'Demo latest anime with recent episode.',
          status: 'ongoing',
          url: 'https://example.com/demo-latest-1'
        },
        {
          id: 'demo-latest-2',
          title: 'Demo Latest Anime 2 - Episode 8',
          image: 'https://via.placeholder.com/200x300/FF9FF3/FFFFFF?text=Latest+2',
          synopsis: 'Another demo latest anime entry.',
          status: 'ongoing',
          url: 'https://example.com/demo-latest-2'
        }
      ],
      airing: [
        {
          id: 'demo-airing-1',
          title: 'Demo Airing Anime 1',
          image: 'https://via.placeholder.com/200x300/54A0FF/FFFFFF?text=Airing+1',
          synopsis: 'Demo currently airing anime.',
          status: 'ongoing',
          url: 'https://example.com/demo-airing-1'
        },
        {
          id: 'demo-airing-2',
          title: 'Demo Airing Anime 2',
          image: 'https://via.placeholder.com/200x300/5F27CD/FFFFFF?text=Airing+2',
          synopsis: 'Another demo airing anime entry.',
          status: 'ongoing',
          url: 'https://example.com/demo-airing-2'
        }
      ]
    };
  }

  /**
   * Get All Genres from daftar-anime-2 page
   */
  static async getGenres() {
    const cacheKey = 'genres:all:v3';

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // First try with Puppeteer for Cloudflare bypass
        const html = await this.scrapeGenresWithPuppeteer();
        const $ = load(html);
        const genres = this.extractGenresFromHtml($);

        if (genres.length > 0) {
          return genres;
        }

        // Fallback to axios if Puppeteer fails or returns no genres
        console.log('Puppeteer scraping returned no genres, trying axios fallback...');
        const { data } = await axiosInstance.get('/daftar-anime-2/');
        const $axios = load(data);
        const axiosGenres = this.extractGenresFromHtml($axios);

        if (axiosGenres.length > 0) {
          return axiosGenres;
        }

        // Final fallback to mock data
        console.error('Both Puppeteer and axios failed to scrape genres, using mock data');
        return this.getMockGenresData();

      } catch (error) {
        console.error('Error scraping genres, using fallback data:', error);
        return this.getMockGenresData();
      }
    });
  }

  /**
   * Scrape genres page with Puppeteer for Cloudflare bypass
   */
  private static async scrapeGenresWithPuppeteer(): Promise<string> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
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
      await page.setViewport({ width: 1366, height: 768 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36');

      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      });

      const genresUrl = `${SITE_CONFIG.BASE_URL}/daftar-anime-2/`;

      await page.goto(genresUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));

      const content = await page.content();
      return content;

    } catch (error) {
      console.error('Puppeteer genres scraping failed:', error);
      throw error;
    } finally {
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
   * Extract genres from HTML using the specific structure
   */
  private static extractGenresFromHtml($: any): Array<{name: string, slug: string, url: string}> {
    const genres: Array<{name: string, slug: string, url: string}> = [];

    // Target the specific structure: td.filter_act.genres > label.tax_fil
    $('td.filter_act.genres label.tax_fil').each((_: any, el: any) => {
      const $label = $(el);
      const text = $label.text().trim();
      const $input = $label.find('input[name="genre[]"]');
      const slug = $input.attr('value');

      if (text && slug) {
        genres.push({
          name: text,
          slug: slug,
          url: `${SITE_CONFIG.BASE_URL}/genre/${slug}/`
        });
      }
    });

    // Remove duplicates based on slug
    const uniqueGenres = genres.filter((genre, index, self) =>
      index === self.findIndex(g => g.slug === genre.slug)
    );

    return uniqueGenres;
  }

  /**
   * Get Mock Genres Data for Development/Testing
   */
  private static getMockGenresData() {
    console.log('Using mock genres data due to site accessibility issues');

    return [
      { name: 'Action', slug: 'action', url: `${SITE_CONFIG.BASE_URL}/genre/action/` },
      { name: 'Adventure', slug: 'adventure', url: `${SITE_CONFIG.BASE_URL}/genre/adventure/` },
      { name: 'Comedy', slug: 'comedy', url: `${SITE_CONFIG.BASE_URL}/genre/comedy/` },
      { name: 'Drama', slug: 'drama', url: `${SITE_CONFIG.BASE_URL}/genre/drama/` },
      { name: 'Fantasy', slug: 'fantasy', url: `${SITE_CONFIG.BASE_URL}/genre/fantasy/` },
      { name: 'Romance', slug: 'romance', url: `${SITE_CONFIG.BASE_URL}/genre/romance/` },
      { name: 'Sci-Fi', slug: 'sci-fi', url: `${SITE_CONFIG.BASE_URL}/genre/sci-fi/` },
      { name: 'School', slug: 'school', url: `${SITE_CONFIG.BASE_URL}/genre/school/` },
      { name: 'Super Power', slug: 'super-power', url: `${SITE_CONFIG.BASE_URL}/genre/super-power/` },
      { name: 'Sports', slug: 'sports', url: `${SITE_CONFIG.BASE_URL}/genre/sports/` },
      { name: 'Supernatural', slug: 'supernatural', url: `${SITE_CONFIG.BASE_URL}/genre/supernatural/` },
      { name: 'Team Sports', slug: 'teamsports', url: `${SITE_CONFIG.BASE_URL}/genre/teamsports/` },
      { name: 'Team', slug: 'team', url: `${SITE_CONFIG.BASE_URL}/genre/team/` },
      { name: 'Shounen', slug: 'shounen', url: `${SITE_CONFIG.BASE_URL}/genre/shounen/` },
      { name: 'Isekai', slug: 'isekai', url: `${SITE_CONFIG.BASE_URL}/genre/isekai/` },
      { name: 'Seinen', slug: 'seinen', url: `${SITE_CONFIG.BASE_URL}/genre/seinen/` },
      { name: 'Reincarnation', slug: 'reincarnation', url: `${SITE_CONFIG.BASE_URL}/genre/reincarnation/` },
      { name: 'Mystery', slug: 'mystery', url: `${SITE_CONFIG.BASE_URL}/genre/mystery/` },
      { name: 'Historical', slug: 'historical', url: `${SITE_CONFIG.BASE_URL}/genre/historical/` },
      { name: 'Harem', slug: 'harem', url: `${SITE_CONFIG.BASE_URL}/genre/harem/` },
      { name: 'Ecchi', slug: 'ecchi', url: `${SITE_CONFIG.BASE_URL}/genre/ecchi/` },
      { name: 'Slice of Life', slug: 'slice-of-life', url: `${SITE_CONFIG.BASE_URL}/genre/slice-of-life/` }
    ];
  }
}
