import { load } from 'cheerio';
import { Anime } from '@/types/anime';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { SITE_CONFIG } from '../config';
import puppeteer, { Browser, Page } from 'puppeteer';

// Helper function to scrape batch items from the batch page
const scrapeBatchItems = ($: any): any[] => {
  const items: any[] = [];

  // Try multiple selectors to find all batch items on the page
  const selectors = [
    'div.thumb',                    // Most common
    'article.animpost',             // Article posts
    'div.animepost',                // Anime posts
    '.post-item',                   // Generic post items
    '.entry',                       // Entry containers
    '.item',                        // Generic items
    '[class*="batch"]',             // Any element with batch in class
    '[class*="anime"]'              // Any element with anime in class
  ];

  let foundItems = 0;

  // Try each selector
  for (const selector of selectors) {
    const $elements = $(selector);
    if ($elements.length > 0) {
      console.log(`Found ${$elements.length} elements with selector: ${selector}`);

      $elements.each((_: any, el: any) => {
        const $el = $(el);
        const $link = $el.find('a[href*="/batch/"]').first();

        if ($link.length > 0) {
          const href = $link.attr('href');
          const $img = $link.find('img').first() || $el.find('img').first();

          if (href && href.includes('/batch/')) {
            const title = $img.attr('title') || $img.attr('alt') || $link.text().trim() || '';
            const image = $img.attr('src') || $img.attr('data-src') || '';

            if (title || image) { // Only add if we have some identifying info
              items.push({
                id: href.split('/').filter(Boolean).pop() || '',
                title: title,
                image: image,
                synopsis: '',
                status: 'ongoing',
                url: href,
              });
              foundItems++;
            }
          }
        }
      });

      // If we found items with this selector, we can break or continue to find more
      // For now, let's collect from all selectors to be thorough
    }
  }

  // Also try to find any links that contain /batch/ directly
  $('a[href*="/batch/"]').each((_: any, el: any) => {
    const $link = $(el);
    const href = $link.attr('href');

    if (href && href.includes('/batch/')) {
      const $img = $link.find('img').first();
      const title = $img.attr('title') || $img.attr('alt') || $link.text().trim() || '';
      const image = $img.attr('src') || $img.attr('data-src') || '';

      // Check if we already have this item
      const existingItem = items.find(item => item.url === href);
      if (!existingItem && (title || image)) {
        items.push({
          id: href.split('/').filter(Boolean).pop() || '',
          title: title,
          image: image,
          synopsis: '',
          status: 'ongoing',
          url: href,
        });
        foundItems++;
      }
    }
  });

  // Remove duplicates based on ID
  const uniqueItems = items.filter((item, index, self) =>
    index === self.findIndex(i => i.id === item.id)
  );

  console.log(`Extracted ${foundItems} batch items, ${uniqueItems.length} unique`);
  return uniqueItems;
};

export class BatchScraper {
  /**
   * Get Batch Anime
   */
  static async getBatch(page: number = 1, limit: number = 20) {
    const cacheKey = `anime:batch:page:${page}:limit:${limit}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        // Try Puppeteer first for better success rate
        return await this.scrapeBatchWithPuppeteer(page, limit);
      } catch (puppeteerError) {
        console.error('Puppeteer batch scraping failed, falling back to axios:', puppeteerError);

        try {
          // Fallback to axios
          const batchUrl = page === 1 ? '/daftar-batch/' : `/daftar-batch/page/${page}/`;
          const { data } = await axiosInstance.get(batchUrl);
          const $ = load(data);
          const batches = scrapeBatchItems($);

          // Try to extract pagination information from the page
          let totalPages = 50; // Default fallback
          let totalItems = 1000; // Default fallback

          // Look for pagination elements
          const $pagination = $('.pagination, .wp-pagenavi, .page-numbers');
          if ($pagination.length > 0) {
            // Try to find the last page number
            const pageLinks = $pagination.find('a').toArray();
            const pageNumbers: number[] = [];

            pageLinks.forEach((link) => {
              const href = $(link).attr('href') || '';
              const text = $(link).text().trim();

              // Extract page number from URL like /daftar-batch/page/5/
              const pageMatch = href.match(/\/daftar-batch\/page\/(\d+)\//);
              if (pageMatch) {
                pageNumbers.push(parseInt(pageMatch[1]));
              }

              // Also check text content for page numbers
              const numMatch = text.match(/^\d+$/);
              if (numMatch) {
                pageNumbers.push(parseInt(numMatch[0]));
              }
            });

            if (pageNumbers.length > 0) {
              totalPages = Math.max(...pageNumbers);
            }
          }

          // Estimate total items based on current page results and total pages
          if (batches.length > 0) {
            totalItems = Math.max(totalItems, batches.length * totalPages);
          }

          return {
            data: batches.slice(0, limit),
            pagination: {
              currentPage: page,
              totalPages: totalPages,
              totalItems: totalItems,
            }
          };
        } catch (axiosError) {
          console.error('Axios batch scraping also failed:', axiosError);
          throw new Error(`Failed to scrape batch anime: ${axiosError}`);
        }
      }
    });
  }

  /**
   * Puppeteer-based scraping method for batch anime
   */
  private static async scrapeBatchWithPuppeteer(pageNum: number = 1, limit: number = 20): Promise<{data: any[], pagination: any}> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      console.log(`Launching Puppeteer browser for batch anime page: ${pageNum}`);

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

      const batchUrl = pageNum === 1
        ? `${SITE_CONFIG.BASE_URL}/daftar-batch/`
        : `${SITE_CONFIG.BASE_URL}/daftar-batch/page/${pageNum}/`;

      console.log(`Navigating to batch URL: ${batchUrl}`);

      // Navigate to the batch page
      await page.goto(batchUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait a bit for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Scroll down multiple times to load more content
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 4);
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight / 2);
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight * 3 / 4);
      });
      await new Promise(resolve => setTimeout(resolve, 1000));

      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get the page content
      const content = await page.content();
      console.log('Batch page content retrieved, length:', content.length);

      // Parse with Cheerio
      const $ = load(content);

      // Extract batch results
      const batches = scrapeBatchItems($);

      // Try to extract pagination information
      let totalPages = 50; // Default fallback
      let totalItems = 1000; // Default fallback

      // Look for pagination elements
      const $pagination = $('.pagination, .wp-pagenavi, .page-numbers');
      if ($pagination.length > 0) {
        // Try to find the last page number
        const pageLinks = $pagination.find('a').toArray();
        const pageNumbers: number[] = [];

        pageLinks.forEach((link) => {
          const href = $(link).attr('href') || '';
          const text = $(link).text().trim();

          // Extract page number from URL like /daftar-batch/page/5/
          const pageMatch = href.match(/\/daftar-batch\/page\/(\d+)\//);
          if (pageMatch) {
            pageNumbers.push(parseInt(pageMatch[1]));
          }

          // Also check text content for page numbers
          const numMatch = text.match(/^\d+$/);
          if (numMatch) {
            pageNumbers.push(parseInt(numMatch[0]));
          }
        });

        if (pageNumbers.length > 0) {
          totalPages = Math.max(...pageNumbers);
        }
      }

      // Estimate total items based on current page results and total pages
      if (batches.length > 0) {
        totalItems = Math.max(totalItems, batches.length * totalPages);
      }

      return {
        data: batches.slice(0, limit),
        pagination: {
          currentPage: pageNum,
          totalPages: totalPages,
          totalItems: totalItems,
        }
      };

    } catch (error) {
      console.error('Puppeteer batch scraping failed:', error);
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