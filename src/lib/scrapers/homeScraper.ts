import { load } from 'cheerio';
import { Anime, Genre } from '@/types/anime';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { SITE_CONFIG } from '../config';

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
   * Scrape Home Page
   */
  static async getHome() {
    const cacheKey = 'home:all';

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        const { data } = await axiosInstance.get('/');
        const $ = load(data);

        return {
          featured: scrapeFeatured($),
          popular: scrapePopular($),
          latest: scrapeLatest($),
          airing: scrapeAiring($),
        };
      } catch (error) {
        throw new Error(`Failed to scrape home page: ${error}`);
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