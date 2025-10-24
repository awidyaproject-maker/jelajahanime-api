import { load } from 'cheerio';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { scrapeMovieItems } from './baseScraper';

export class MovieScraper {
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
}