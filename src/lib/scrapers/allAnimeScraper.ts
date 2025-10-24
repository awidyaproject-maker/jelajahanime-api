import { load } from 'cheerio';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { scrapeAnimeItems } from './baseScraper';

export class AllAnimeScraper {
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
}