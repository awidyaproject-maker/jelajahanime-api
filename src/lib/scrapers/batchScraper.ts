import { load } from 'cheerio';
import { Anime } from '@/types/anime';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { SITE_CONFIG } from '../config';

// Helper function to scrape anime items from .thumb elements or article tags
const scrapeAnimeItems = ($: any, container?: string): any[] => {
  const items: any[] = [];

  // Try different selectors
  let $items = $('div.thumb');

  // If no thumb elements found, try article tags (for search results, etc)
  if ($items.length === 0) {
    $items = $('article.animpost, div.animepost');
  }

  $items.each((_: any, el: any) => {
    const $el = $(el);
    const $link = $el.find('a').first();
    const href = $link.attr('href');
    const $img = $link.find('img');

    if (href) {
      items.push({
        id: href.split('/').filter(Boolean).pop() || '',
        title: $img.attr('title') || $img.attr('alt') || '',
        image: $img.attr('src') || '',
        synopsis: '',
        status: 'ongoing',
        url: href,
      });
    }
  });

  return items;
};

export class BatchScraper {
  /**
   * Get Batch Anime
   */
  static async getBatch(page: number = 1, limit: number = 20) {
    const cacheKey = `anime:batch:page:${page}:limit:${limit}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // Try specific batch URL first
        let data;
        try {
          const response = await axiosInstance.get('/daftar-batch/');
          data = response.data;
        } catch (batchError) {
          // Fallback to homepage if batch URL fails
          console.warn('Batch URL failed, using homepage fallback:', batchError);
          const response = await axiosInstance.get('/');
          data = response.data;
        }

        const $ = load(data);
        const batches = scrapeAnimeItems($);

        return {
          data: batches.slice(0, limit),
          pagination: {
            currentPage: page,
            totalPages: 50,
            totalItems: 1000,
          }
        };
      } catch (error) {
        throw new Error(`Failed to scrape batch anime: ${error}`);
      }
    });
  }

  /**
   * Get Batch Download Information
   */
  static async getBatchDownload(batchId: string) {
    const cacheKey = `batch:download:${batchId}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        const { data } = await axiosInstance.get(`/batch/${batchId}`);
        const $ = load(data);

        // Extract title
        let title = '';
        const titleSelectors = ['h1', '.entry-title', '.post-title', '.batch-title'];
        for (const selector of titleSelectors) {
          const text = $(selector).first().text().trim();
          if (text) {
            title = text;
            break;
          }
        }

        // Extract basic info with better logic
        let episodes = 0;
        let size = '';
        let quality = '';

        // Look for info in various formats
        const infoSelectors = ['.batch-info', '.download-info', '.info-table tr', '.spe span'];
        $(infoSelectors.join(', ')).each((_, el) => {
          const $el = $(el);
          const text = $el.text().toLowerCase();

          // Extract episodes count
          const epMatch = text.match(/(\d+)\s*(episode|eps)/i);
          if (epMatch && parseInt(epMatch[1]) > episodes) {
            episodes = parseInt(epMatch[1]);
          }

          // Extract size
          const sizeMatch = text.match(/(\d+(?:\.\d+)?)\s*(gb|mb)/i);
          if (sizeMatch && !size) {
            size = `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}`;
          }

          // Extract quality from text
          if (text.includes('1080p') && quality !== '1080p') {
            quality = '1080p';
          } else if (text.includes('720p') && !quality.includes('1080')) {
            quality = '720p';
          } else if (text.includes('480p') && !quality.includes('720') && !quality.includes('1080')) {
            quality = '480p';
          }
        });

        // Extract download servers with better logic
        const servers: any[] = [];
        const qualityGroups: { [key: string]: any[] } = {};

        $('a').each((_, el) => {
          const $el = $(el);
          const href = $el.attr('href');
          const text = $el.text().toLowerCase();

          // Only process actual download links (exclude social media, navigation, etc.)
          if (href &&
              href.length > 10 &&
              !href.startsWith('#') &&
              !href.includes(SITE_CONFIG.SITE_DOMAIN) &&
              !href.includes('facebook.com') &&
              !href.includes('instagram.com') &&
              !href.includes('twitter.com') &&
              !href.includes('tiktok.com') &&
              !href.includes('telegram.org') &&
              !href.includes('discord.com') &&
              !href.includes('youtube.com') &&
              !href.includes('play.google.com') &&
              !href.includes('mangakyo.co') &&
              !href.includes('sorenamoo.com') &&
              !href.includes('linktr.ee') &&
              // Must contain download-related keywords or server domains
              (href.includes('acefile.co') ||
               href.includes('bayfiles.com') ||
               href.includes('letsupload.io') ||
               href.includes('mega.nz') ||
               href.includes('mediafire.com') ||
               href.includes('zippyshare.com') ||
               href.includes('drive.google.com') ||
               href.includes('gdrive') ||
               href.includes('download') ||
               href.includes('batch') ||
               href.includes('.rar') ||
               href.includes('.mkv') ||
               href.includes('.mp4'))) {

            // Determine quality from URL
            let linkQuality = '720p'; // default
            if (href.includes('360p')) linkQuality = '360p';
            else if (href.includes('480p')) linkQuality = '480p';
            else if (href.includes('720p')) linkQuality = '720p';
            else if (href.includes('1080p')) linkQuality = '1080p';

            // Determine server type
            let serverName = 'Unknown Server';
            let speed = 'Fast';

            if (href.includes('acefile.co')) {
              serverName = 'AceFile';
              speed = 'Fast';
            } else if (href.includes('bayfiles.com')) {
              serverName = 'BayFiles';
              speed = 'Fast';
            } else if (href.includes('letsupload.io')) {
              serverName = 'LetsUpload';
              speed = 'Fast';
            } else if (href.includes('mega.nz') || href.includes('mega.co')) {
              serverName = 'Mega.nz';
              speed = 'Unlimited';
            } else if (href.includes('drive.google') || href.includes('gdrive')) {
              serverName = 'Google Drive';
              speed = 'Fast';
            } else if (href.includes('mediafire.com')) {
              serverName = 'MediaFire';
              speed = 'Fast';
            } else if (href.includes('zippyshare.com')) {
              serverName = 'ZippyShare';
              speed = 'Fast';
            }

            // Group by quality
            if (!qualityGroups[linkQuality]) {
              qualityGroups[linkQuality] = [];
            }

            // Avoid duplicates
            if (!qualityGroups[linkQuality].find(s => s.link === href)) {
              qualityGroups[linkQuality].push({
                name: serverName,
                link: href,
                speed: speed
              });
            }
          }
        });

        // Flatten quality groups into servers array
        Object.keys(qualityGroups).forEach(quality => {
          qualityGroups[quality].forEach(server => {
            servers.push(server);
          });
        });

        // If no servers found, try alternative approach with more specific selectors
        if (servers.length === 0) {
          // Look for download links in specific containers
          $('.download-link a, .batch-download a, .dl-link a, .server-list a').each((_, el) => {
            const $el = $(el);
            const href = $el.attr('href');
            const text = $el.text().toLowerCase();

            if (href && (text.includes('download') || text.includes('batch') ||
                href.includes('acefile') || href.includes('bayfiles') || href.includes('letsupload'))) {
              servers.push({
                name: text || 'Download Server',
                link: href,
                speed: 'Unknown'
              });
            }
          });
        }

        // If no quality found in text, determine from available servers
        if (!quality && servers.length > 0) {
          const qualities = servers.map(s => {
            if (s.link.includes('1080p')) return '1080p';
            if (s.link.includes('720p')) return '720p';
            if (s.link.includes('480p')) return '480p';
            if (s.link.includes('360p')) return '360p';
            return '';
          }).filter(q => q);

          if (qualities.includes('1080p')) quality = '1080p';
          else if (qualities.includes('720p')) quality = '720p';
          else if (qualities.includes('480p')) quality = '480p';
          else if (qualities.includes('360p')) quality = '360p';
        }

        // Fallback values
        if (!title) title = `Batch Download ${batchId}`;
        if (episodes === 0) episodes = 12; // Default assumption
        if (!size) size = 'Unknown';
        if (!quality) quality = '720p'; // Default assumption

        return {
          batchId,
          title,
          episodes,
          size,
          quality,
          servers: servers.length > 0 ? servers : [{
            name: 'Server 1',
            link: 'https://example.com/download',
            speed: 'Unlimited'
          }],
          note: servers.length === 0 ? 'Download servers belum dapat diekstrak dari website' : undefined
        };
      } catch (error) {
        console.error('Error scraping batch download:', error);
        // Return fallback data
        return {
          batchId,
          title: `Batch Download ${batchId}`,
          episodes: 12,
          size: 'Unknown',
          quality: '720p',
          servers: [{
            name: 'Server 1',
            link: 'https://example.com/download',
            speed: 'Unlimited'
          }],
          note: 'Error occurred while scraping download information'
        };
      }
    });
  }
}