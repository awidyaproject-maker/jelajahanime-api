import { Browser, Page } from 'puppeteer';
import { load } from 'cheerio';
import { createOptimizedScrapingSession, navigateOptimized, cleanupBrowser } from '../puppeteer-optimized';
import { SITE_CONFIG } from '../config';
import { collectVideoSourcesFromPlayerOptions } from './episodeScraper';
import { EpisodeData } from '@/types/anime';

// Function to resolve embed URLs to direct media URLs
async function resolveEmbedUrl(embedUrl: string): Promise<string> {
  // Check if this is a Wibufile embed URL
  if (embedUrl.includes('api.wibufile.com/embed/')) {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      console.log(`🔗 Resolving Wibufile embed URL: ${embedUrl}`);
      const session = await createOptimizedScrapingSession({
        blockResources: false
      });
      browser = session.browser;
      page = session.page;

      await navigateOptimized(page, embedUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for the page to load and extract video sources
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Look for direct video URLs in various ways
      const videoUrl = await page.evaluate(() => {
        // Check for video elements
        const videoElements = document.querySelectorAll('video source, video');
        for (const video of videoElements) {
          const src = video.getAttribute('src');
          if (src && (src.includes('.mp4') || src.includes('.m3u8'))) {
            return src;
          }
        }

        // Check for script tags containing video URLs
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const content = script.textContent || '';
          // Look for MP4 URLs in script content
          const mp4Match = content.match(/"?([^"\s]+\.mp4[^"\s]*)"?/);
          if (mp4Match && mp4Match[1]) {
            return mp4Match[1];
          }
        }

        // Check for download links
        const downloadLinks = document.querySelectorAll('a[href*=".mp4"], a[href*="download"]');
        for (const link of downloadLinks) {
          const href = link.getAttribute('href');
          if (href && href.includes('.mp4')) {
            return href;
          }
        }

        return null;
      });

      if (videoUrl) {
        console.log(`✅ Resolved to direct URL: ${videoUrl.substring(0, 50)}...`);
        return videoUrl.startsWith('//') ? `https:${videoUrl}` : videoUrl;
      } else {
        console.log(`⚠️ Could not resolve embed URL: ${embedUrl}`);
        return embedUrl; // Return original if resolution fails
      }
    } catch (error) {
      console.error(`❌ Error resolving embed URL ${embedUrl}:`, error);
      return embedUrl; // Return original on error
    }
  }

  // For other embed URLs, return as-is for now
  return embedUrl;
}

async function extractEpisodeDownloads(page: Page): Promise<Array<{
  type: string;
  qualities: Array<{
    quality: string;
    servers: Array<{
      name: string;
      url: string;
    }>;
  }>;
}>> {
  try {
    // Get the page HTML content
    const html = await page.content();
    const $ = load(html);

    const downloads: Array<{
      type: string;
      qualities: Array<{
        quality: string;
        servers: Array<{
          name: string;
          url: string;
        }>;
      }>;
    }> = [];

    // Find the specific download section: <div class="download-eps" id="downloadb">
    const $downloadSection = $('#downloadb.download-eps');

    if ($downloadSection.length === 0) {
      console.log('⚠️ No download section found with id="downloadb" and class="download-eps"');
      return downloads;
    }

    console.log('📥 Found download section, extracting video types and qualities...');

    // Get all direct children of the download section
    const $children = $downloadSection.children();

    // Iterate through children to find <p><b>...</b></p> tags (video types)
    let currentVideoType = '';
    let currentTypeQualities: Array<{
      quality: string;
      servers: Array<{
        name: string;
        url: string;
      }>;
    }> = [];

    $children.each((index, child) => {
      const $child = $(child);

      // Check if this is a <p><b>...</b></p> tag (video type indicator)
      if ($child.is('p') && $child.find('b').length > 0) {
        // Save previous video type if it has qualities
        if (currentVideoType && currentTypeQualities.length > 0) {
          downloads.push({
            type: currentVideoType,
            qualities: currentTypeQualities
          });
        }

        // Extract video type from <p><b>...</b></p>
        const typeText = $child.find('b').first().text().trim().toLowerCase();

        // Determine video type based on content
        if (typeText.includes('x265')) {
          currentVideoType = 'x265';
        } else if (typeText.includes('mp4')) {
          currentVideoType = 'mp4';
        } else {
          currentVideoType = 'mkv';
        }

        console.log(`🎬 Found video type: ${currentVideoType} (from: "${typeText}")`);
        currentTypeQualities = []; // Reset qualities for new type

      } else if ($child.is('ul') && currentVideoType) {
        // This is a <ul> that belongs to the current video type
        // Extract qualities and servers from this <ul>
        $child.find('li').each((_, liEl) => {
          const $li = $(liEl);

          // Extract quality from <strong> tag
          const $strong = $li.find('strong').first();
          let quality = '';

          if ($strong.length > 0) {
            const qualityText = $strong.text().trim().toLowerCase();

            // Handle various quality formats
            if (qualityText.includes('360p') || qualityText.includes('360')) {
              quality = '360p';
            } else if (qualityText.includes('480p') || qualityText.includes('480')) {
              quality = '480p';
            } else if (qualityText.includes('720p') || qualityText.includes('720')) {
              quality = '720p';
            } else if (qualityText.includes('1080p') || qualityText.includes('1080')) {
              quality = '1080p';
            } else if (qualityText.includes('4k') || qualityText.includes('2160p')) {
              quality = '4K';
            } else if (qualityText.includes('fullhd') || qualityText.includes('fhd')) {
              quality = 'FULLHD';
            } else if (qualityText.includes('mp4hd')) {
              quality = 'MP4HD';
            } else if (qualityText.includes('hd')) {
              quality = 'HD';
            } else {
              // Keep the original text if it contains quality-like patterns
              const qualityMatch = qualityText.match(/(\d{3,4}p|4k|fullhd|fhd|hd|mp4hd)/i);
              if (qualityMatch) {
                quality = qualityMatch[1].toUpperCase();
              }
            }
          }

          // If no quality found in strong, try to extract from li text
          if (!quality) {
            const liText = $li.text().toLowerCase();
            const qualityMatch = liText.match(/(\d{3,4}p|4k|fullhd|fhd|hd|mp4hd)/i);
            if (qualityMatch) {
              quality = qualityMatch[1].toUpperCase();
            }
          }

          // Skip if no quality found
          if (!quality) {
            return; // continue to next li
          }

          // Extract server links from <a> tags within this <li>
          const servers: Array<{
            name: string;
            url: string;
          }> = [];

          $li.find('a').each((_, linkEl) => {
            const $link = $(linkEl);
            const href = $link.attr('href');
            const linkText = $link.text().trim();

            if (href && href.length > 10 && !href.startsWith('#')) {
              // Determine server name from URL
              let serverName = linkText || 'Unknown Server';

              if (href.includes('gofile.io')) serverName = 'Gofile';
              else if (href.includes('krakenfiles.com')) serverName = 'Krakenfile';
              else if (href.includes('mirrored.to')) serverName = 'Mirrored';
              else if (href.includes('pixeldrain.com')) serverName = 'Pixeldrain';
              else if (href.includes('acefile.co')) serverName = 'AceFile';
              else if (href.includes('bayfiles.com')) serverName = 'BayFiles';
              else if (href.includes('letsupload.io')) serverName = 'LetsUpload';
              else if (href.includes('mega.nz') || href.includes('mega.co')) serverName = 'Mega.nz';
              else if (href.includes('mediafire.com')) serverName = 'MediaFire';
              else if (href.includes('zippyshare.com')) serverName = 'ZippyShare';
              else if (href.includes('drive.google.com') || href.includes('gdrive')) serverName = 'Google Drive';
              else if (href.includes('file.io')) serverName = 'File.io';
              else if (href.includes('wibufile.com')) serverName = 'Wibufile';
              else if (href.includes('nakama.to')) serverName = 'Nakama';
              else if (href.includes('pucuktranslation.com')) serverName = 'Pucuk';

              // Avoid duplicates
              if (!servers.find(s => s.url === href)) {
                servers.push({
                  name: serverName,
                  url: href
                });
              }
            }
          });

          // Only add quality if it has servers
          if (servers.length > 0) {
            // Check if this quality already exists for current type
            const existingQuality = currentTypeQualities.find(q => q.quality === quality);
            if (existingQuality) {
              // Merge servers
              servers.forEach(server => {
                if (!existingQuality.servers.find(s => s.url === server.url)) {
                  existingQuality.servers.push(server);
                }
              });
            } else {
              currentTypeQualities.push({
                quality,
                servers
              });
            }
          }
        });
      }
    });

    // Don't forget to add the last video type
    if (currentVideoType && currentTypeQualities.length > 0) {
      downloads.push({
        type: currentVideoType,
        qualities: currentTypeQualities
      });
    }

    console.log(`📥 Successfully extracted ${downloads.length} download types with dynamic detection`);
    downloads.forEach(download => {
      console.log(`  - ${download.type}: ${download.qualities.length} qualities`);
      download.qualities.forEach(quality => {
        console.log(`    - ${quality.quality}: ${quality.servers.length} servers`);
      });
    });

    return downloads;
  } catch (error) {
    console.error('❌ Error extracting downloads:', error);
    return [];
  }
}

async function extractEpisodeMetadata(page: Page): Promise<import('@/types/anime').EpisodeMetadata> {
  try {
    const metadata = await page.evaluate(() => {
      // Extract title from h1.entry-title
      const titleElement = document.querySelector('h1.entry-title');
      const title = titleElement?.textContent?.trim() || null;

      // Extract description from div.entry-content.entry-content-single
      const descriptionElement = document.querySelector('div.entry-content.entry-content-single');
      const description = descriptionElement?.textContent?.trim() || null;

      // Extract episode number from span[itemprop="episodeNumber"]
      const episodeNumberElement = document.querySelector('span[itemprop="episodeNumber"]');
      const episode_number = episodeNumberElement?.textContent?.trim() || null;

      // Extract subtitle language from span.lg inside span.epx
      const subtitleLanguageElement = document.querySelector('span.epx span.lg');
      const subtitle_language = subtitleLanguageElement?.textContent?.trim() || null;

      // Extract release time from span.time-post
      const releaseTimeElement = document.querySelector('span.time-post');
      const release_time = releaseTimeElement?.textContent?.trim() || null;

      return {
        title,
        description,
        episode_number,
        subtitle_language,
        release_time
      };
    });

    console.log('📋 Extracted metadata:', metadata);
    return metadata;
  } catch (error) {
    console.error('❌ Error extracting episode metadata:', error);
    return {
      title: null,
      description: null,
      episode_number: null,
      subtitle_language: null,
      release_time: null
    };
  }
}

export class DynamicEpisodeScraper {
  static async scrape(episodeSlug: string): Promise<EpisodeData> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      console.log(`🔍 Starting dynamic scrape for: ${episodeSlug}`);

      const session = await createOptimizedScrapingSession({
        blockResources: false
      });
      browser = session.browser;
      page = session.page;

      const episodeUrl = `${SITE_CONFIG.BASE_URL}/${episodeSlug}/`;
      console.log(`🌐 Navigating to: ${episodeUrl}`);

      await navigateOptimized(page, episodeUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      console.log('✅ Page loaded, extracting metadata and downloads...');

      // Extract episode metadata
      const metadata = await extractEpisodeMetadata(page);

      // Extract download links
      const downloads = await extractEpisodeDownloads(page);

      // Debug: Check what elements exist on the page
      const debugInfo = await page.evaluate(() => {
        const serverContainer = document.querySelector('#server');
        const serverOptions = document.querySelectorAll('#server ul li .east_player_option');
        const allEastOptions = document.querySelectorAll('.east_player_option');

        return {
          hasServerContainer: !!serverContainer,
          serverOptionsCount: serverOptions.length,
          allEastOptionsCount: allEastOptions.length,
          serverOptionsText: Array.from(serverOptions).map(el => el.textContent?.trim()).slice(0, 5),
          allEastOptionsText: Array.from(allEastOptions).map(el => el.textContent?.trim()).slice(0, 5),
          pageTitle: document.title,
          url: window.location.href
        };
      });

      console.log('🔍 Debug info:', debugInfo);

      // Wait for the server options to load
      try {
        await page.waitForSelector('#server ul li .east_player_option', { timeout: 15000 });
        console.log('✅ Server options found');
      } catch {
        console.log('⚠️ Server options not found within timeout, trying fallback selector...');

        // Try fallback selector
        try {
          await page.waitForSelector('.east_player_option', { timeout: 5000 });
          console.log('✅ Found east_player_option elements with fallback selector');
        } catch {
          console.log('⚠️ No east_player_option elements found at all');
          return {
            ...metadata,
            servers: [],
            downloads
          };
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1200));

      // Extract video sources directly from player options
      console.log('🎬 Starting video source extraction...');
      const servers = await collectVideoSourcesFromPlayerOptions(page);

      console.log(`✅ Extracted ${servers.length} video sources from player options`);

      // Resolve any embed URLs to direct media URLs
      console.log('🔗 Resolving embed URLs...');
      const resolvedServers = await Promise.all(
        servers.map(async (server) => {
          if (server.url && server.url.includes('embed')) {
            const resolvedUrl = await resolveEmbedUrl(server.url);
            return {
              ...server,
              url: resolvedUrl
            };
          }
          return server;
        })
      );

      console.log(`✅ Resolved ${resolvedServers.length} server URLs`);

      return {
        ...metadata,
        servers: resolvedServers,
        downloads
      };
    } catch (error) {
      console.error(`❌ Error scraping ${episodeSlug}:`, error);
      return {
        title: null,
        description: null,
        episode_number: null,
        subtitle_language: null,
        release_time: null,
        servers: [],
        downloads: []
      };
    } finally {
      await cleanupBrowser(browser, page);
    }
  }
}
