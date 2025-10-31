import { AnimeDetail, StreamServer, Anime } from '@/types/anime';
import {
  HomeScraper,
  AnimeDetailScraper,
  BatchScraper,
  EpisodeScraper,
  ScheduleScraper,
  AiringScraper,
  AllAnimeScraper,
  LatestAnimeScraper,
  CompletedScraper,
  PopularScraper,
  MovieScraper,
  SearchScraper,
  GenreScraper
} from './scrapers';

export class AnimeScraper {
  /**
   * Scrape Home Page
   */
  static async getHome() {
    return HomeScraper.getHome();
  }

  /**
   * Get All Genres
   */
  static async getGenres() {
    return HomeScraper.getGenres();
  }

  /**
   * Get All Anime with Pagination
   */
  static async getAllAnime(page: number = 1, limit: number = 20) {
    return AllAnimeScraper.getAllAnime(page, limit);
  }

  /**
   * Get Latest Anime
   */
  static async getLatestAnime(limit: number = 20, page: number = 1) {
    return LatestAnimeScraper.getLatestAnime(limit, page);
  }

  /**
   * Get All Latest Anime (helper method to collect as much data as possible)
   */
  static async getAllLatestAnime(): Promise<Anime[]> {
    return LatestAnimeScraper.getAllLatestAnime();
  }

  /**
   * Get Airing Anime
   */
  static async getAiringAnime(page: number = 1, limit: number = 20) {
    return AiringScraper.getAiringAnime(page, limit);
  }

  /**
   * Get Completed Anime
   */
  static async getCompletedAnime(page: number = 1, limit: number = 20) {
    return CompletedScraper.getCompletedAnime(page, limit);
  }

  /**
   * Get Popular Anime
   */
  static async getPopularAnime(limit: number = 20) {
    return PopularScraper.getPopularAnime(limit);
  }

  /**
   * Get Anime Movies
   */
  static async getMovies(page: number = 1, limit: number = 20) {
    return MovieScraper.getMovies(page, limit);
  }

  /**
   * Get Batch Anime
   */
  static async getBatch(page: number = 1, limit: number = 20) {
    return BatchScraper.getBatch(page, limit);
  }

  /**
   * Search Anime
   */
  static async searchAnime(query: string, page: number = 1) {
    return SearchScraper.searchAnime(query, page);
  }

  /**
   * Get Anime by Genre
   */
  static async getAnimeByGenre(genre: string, page: number = 1, limit: number = 20) {
    return GenreScraper.getAnimeByGenre(genre, page, limit);
  }

  /**
   * Get Anime Detail
   */
  static async getAnimeDetail(animeId: string): Promise<AnimeDetail> {
    return AnimeDetailScraper.getAnimeDetail(animeId);
  }

  /**
   * Get Batch Download Information
   */
  static async getBatchDownload(batchId: string) {
    return BatchScraper.getBatchDownload(batchId);
  }

  /**
   * Get Episode Streaming Links
   */
  static async getEpisodeLinks(episodeId: string): Promise<StreamServer[]> {
    return EpisodeScraper.getEpisodeLinks(episodeId);
  }

  static async getSchedule() {
    return ScheduleScraper.getSchedule();
  }
}

export default AnimeScraper;
