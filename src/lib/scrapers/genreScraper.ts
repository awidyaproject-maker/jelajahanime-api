import { load } from 'cheerio';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { scrapeAnimeItems } from './baseScraper';

export class GenreScraper {
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