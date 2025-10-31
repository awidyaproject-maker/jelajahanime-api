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

        // Try to extract pagination information from the page
        let totalPages = 1;
        let totalItems = animes.length;

        // Look for pagination links or page info
        const $pagination = $('.pagination, .wp-pagenavi, nav[aria-label*="pagination"]');

        if ($pagination.length > 0) {
          // Try to find the last page number from pagination links
          const pageNumbers: number[] = [];
          $pagination.find('a, span').each((_: any, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            const $el = $(el);
            const text = $el.text().trim();
            const href = $el.attr('href');

            // Extract page numbers from text
            const pageMatch = text.match(/^\d+$/);
            if (pageMatch) {
              const pageNum = parseInt(pageMatch[0]);
              if (pageNum > 0) {
                pageNumbers.push(pageNum);
              }
            }

            // Extract page numbers from href
            if (href) {
              const urlMatch = href.match(/[?&]page=(\d+)/);
              if (urlMatch) {
                const pageNum = parseInt(urlMatch[1]);
                if (pageNum > 0) {
                  pageNumbers.push(pageNum);
                }
              }
            }
          });

          if (pageNumbers.length > 0) {
            totalPages = Math.max(...pageNumbers);
          }
        }

        // Alternative: Look for "Page X of Y" text
        const pageText = $('body').text();
        const pageOfMatch = pageText.match(/page\s*\d+\s*of\s*(\d+)/i);
        if (pageOfMatch) {
          totalPages = parseInt(pageOfMatch[1]);
        }

        // Alternative: Look for total count in text like "Total: X anime"
        const totalMatch = pageText.match(/total[.:]?\s*(\d+)/i);
        if (totalMatch) {
          totalItems = parseInt(totalMatch[1]);
        }

        // If we couldn't determine total pages, estimate based on current page items
        // Most sites show consistent items per page, so we can estimate
        if (totalPages === 1 && animes.length === limit) {
          // If we got a full page, there might be more pages
          // Try to get page 2 to see if it exists
          try {
            const { data: page2Data } = await axiosInstance.get(`/?page=2`);
            const $page2 = load(page2Data);
            const page2Animes = scrapeAnimeItems($page2);
            if (page2Animes.length > 0) {
              totalPages = Math.max(totalPages, 2);
              // Estimate total items based on 2 pages
              totalItems = Math.max(totalItems, (animes.length + page2Animes.length));
            }
          } catch {
            // Page 2 doesn't exist, so only 1 page
            totalPages = 1;
          }
        }

        // Ensure we don't exceed reasonable limits
        totalPages = Math.min(totalPages, 1000); // Reasonable upper limit
        totalItems = Math.min(totalItems, 50000); // Reasonable upper limit

        return {
          data: animes.slice(0, limit),
          pagination: {
            currentPage: page,
            totalPages: Math.max(1, totalPages),
            totalItems: Math.max(animes.length, totalItems),
          }
        };
      } catch (error) {
        throw new Error(`Failed to scrape all anime: ${error}`);
      }
    });
  }
}