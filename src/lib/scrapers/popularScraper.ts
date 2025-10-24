import { load } from 'cheerio';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { scrapeAnimeItems } from './baseScraper';

export class PopularScraper {
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
}