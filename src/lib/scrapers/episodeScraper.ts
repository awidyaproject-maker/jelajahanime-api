import { load } from 'cheerio';
import { StreamServer } from '@/types/anime';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { buildSiteUrl } from '../config';

export class EpisodeScraper {
  /**
   * Get Episode Streaming Links
   */
  static async getEpisodeLinks(episodeId: string): Promise<StreamServer[]> {
    const cacheKey = `episode:links:${episodeId}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        const { data } = await axiosInstance.get(`/episode/${episodeId}`);
        const $ = load(data);

        const servers: StreamServer[] = [];
        $('.east_player_option').each((_: any, el: any) => {
          const $el = $(el);
          const spanText = $el.find('span').text().trim();

          // Extract server name and quality from span text like "Server 1 480p"
          const serverMatch = spanText.match(/Server\s+(\d+)\s+(\w+)/i);
          if (serverMatch) {
            const serverNum = serverMatch[1];
            const quality = serverMatch[2];

            servers.push({
              name: `Server ${serverNum} (${quality})`,
              url: buildSiteUrl(`${episodeId}?server=${serverNum}&quality=${quality}`), // Placeholder URL for now
              type: 'video',
            });
          }
        });

        // If no servers found with the above method, try alternative selectors
        if (servers.length === 0) {
          $('.server_option a, .streaming a, .player a').each((_: any, el: any) => {
            const $el = $(el);
            servers.push({
              name: $el.text().trim() || 'Streaming Server',
              url: $el.attr('href') || '',
              type: 'video',
            });
          });
        }

        return servers;
      } catch (error) {
        throw new Error(`Failed to scrape episode links: ${error}`);
      }
    });
  }
}