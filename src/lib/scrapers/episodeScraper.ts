import { load } from 'cheerio';
import { StreamServer } from '@/types/anime';
import axiosInstance from '../axios';
import { cacheManager } from '../cache';
import { buildSiteUrl, SITE_CONFIG, getCacheTTL } from '../config';
import { Browser, Page, ElementHandle } from 'puppeteer';
import { createOptimizedScrapingSession, navigateOptimized, scrollOptimized, cleanupBrowser } from '../puppeteer-optimized';

export interface ScrapedServer {
  server: string;
  quality: string;
  url: string;
  type: string;
}

export const SERVER_BUTTON_SELECTORS = [
  '.mirror_line > a',
  '.mirror_dl > button',
  '.mirrorstream > ul > li > a',
  '.download > ul > li > a',
  'a[data-video]',
  'button[data-video]',
  '.server-item',
  '.quality-option'
] as const;

const SERVER_BUTTON_WAIT_SELECTOR = SERVER_BUTTON_SELECTORS.join(', ');
const BUTTON_MATCH_TIMEOUT_MS = 15000;
const IFRAME_TIMEOUT_MS = 9000;
const CLICK_DELAY_MS = 350;

export const EAST_PLAYER_OPTION_SELECTOR = '#server ul li .east_player_option';
const QUALITY_REGEX = /(4k|[0-9]{3,4}p|fullhd|uhd|fhd|hd|sd)/i;

const serverKey = (server: string, quality: string): string =>
  `${server.trim().toLowerCase()}:${quality.trim().toLowerCase()}`;

const normalizeIframeSrc = (src: string): string => {
  if (!src) return '';
  return src.startsWith('//') ? `https:${src}` : src;
};

const normalizeStreamUrl = (src: string): string => {
  if (!src) return '';
  if (src.startsWith('//')) return `https:${src}`;
  return src.trim();
};

const extractQualityToken = (value: string): string => {
  if (!value) return '';
  const match = value.match(QUALITY_REGEX);
  return match ? match[1].toLowerCase() : '';
};

const normalizeServerLabel = (value: string, quality: string): string => {
  if (!value) return '';
  let label = value.replace(/\s+/g, ' ').trim();
  if (quality) {
    const index = label.toLowerCase().indexOf(quality.toLowerCase());
    if (index >= 0) {
      label = label.slice(0, index);
    }
  }
  return label.replace(/\s+/g, ' ').trim();
};

const formatServerLabel = (value: string): string => {
  return value
    .split(' ')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export async function collectVideoSourcesFromPlayerOptions(page: Page): Promise<ScrapedServer[]> {
  // Try multiple selectors for server options
  const selectors = [
    EAST_PLAYER_OPTION_SELECTOR, // '#server ul li .east_player_option'
    '.east_player_option',       // fallback
    '#server .east_player_option', // another fallback
    'ul li .east_player_option'    // another fallback
  ];

  let optionHandles: ElementHandle<Element>[] = [];

  for (const selector of selectors) {
    optionHandles = await page.$$(selector);
    if (optionHandles.length > 0) {
      console.log(`  ✅ Found ${optionHandles.length} server options using selector: ${selector}`);
      break;
    }
  }

  if (!optionHandles.length) {
    console.log('  ⚠️ No .east_player_option elements detected on the page with any selector');
    return [];
  }

  const results: ScrapedServer[] = [];
  const seen = new Set<string>();

  const getCurrentIframeSrc = async (): Promise<string> =>
    await page.evaluate(() => {
      const playerDiv = document.querySelector('#player_embed');
      const iframe = playerDiv?.querySelector('iframe');
      return iframe ? (iframe.getAttribute('src') || '').trim() : '';
    });

  let lastSource = await getCurrentIframeSrc();

  for (const option of optionHandles) {
    try {
      const meta = (await option.evaluate((el) => {
        const element = el as HTMLElement;
        const style = element.getAttribute('style') || '';
        const className = element.className || '';
        const dataset = Object.assign({}, element.dataset || {});
        const text = (element.textContent || '').trim();
        return { style, className, dataset, text };
      })) as {
        style: string;
        className: string;
        dataset: Record<string, string>;
        text: string;
      };

      const styleLower = meta.style.toLowerCase();
      const classLower = meta.className.toLowerCase();

      const isDisabled =
        styleLower.includes('pointer-events: none') ||
        styleLower.includes('opacity: 0.3') ||
        classLower.includes('disabled') ||
        classLower.includes('inactive');

      if (isDisabled) {
        continue;
      }

      const textLabel = meta.text || '';
      const datasetQuality = meta.dataset.quality || '';
      const quality =
        extractQualityToken(datasetQuality) ||
        extractQualityToken(textLabel) ||
        extractQualityToken(meta.dataset.label || '') ||
        extractQualityToken(meta.dataset.resolution || '') ||
        'auto';

      const rawServer =
        normalizeServerLabel(meta.dataset.server || '', quality) ||
        normalizeServerLabel(textLabel, quality) ||
        normalizeServerLabel(meta.dataset.type || '', quality) ||
        normalizeServerLabel(meta.dataset.nume || '', quality) ||
        normalizeServerLabel(meta.dataset.label || '', quality);

      const server = formatServerLabel(rawServer || 'Unknown');
      const normalizedQuality = quality || 'auto';
      const key = serverKey(server, normalizedQuality);

      if (seen.has(key)) {
        continue;
      }

      await option.evaluate(el =>
        el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' })
      );
      await option.click({ delay: 75 });

      // Wait for video source to potentially change
      console.log(`  ⏳ Waiting for video source change after clicking ${server} ${normalizedQuality}...`);

      let videoUrl = '';
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts && !videoUrl) {
        await new Promise(resolve => setTimeout(resolve, 500));
        videoUrl = await getCurrentIframeSrc();

        if (videoUrl && videoUrl !== lastSource) {
          console.log(`  ✅ Found new video URL: ${videoUrl.substring(0, 50)}...`);
          break;
        }

        attempts++;
      }

      if (!videoUrl) {
        console.log(`  ⚠️ No video URL found after ${maxAttempts} attempts for ${server} ${normalizedQuality}`);
      }

      videoUrl = normalizeStreamUrl(videoUrl);

      if (videoUrl) {
        lastSource = videoUrl;
      }

      seen.add(key);
      results.push({
        server,
        quality: normalizedQuality,
        url: videoUrl,
        type: 'video'
      });
    } catch (error) {
      console.log(`  ⚠️ Failed to process east_player_option: ${(error as Error).message}`);
    } finally {
      try {
        await option.dispose();
      } catch {
        // ignore disposal errors
      }
    }

    await delay(150);
  }

  const resolved = results.filter(entry => !!entry.url);

  if (!resolved.length) {
    console.log('  ⚠️ No playable video sources found after clicking server options');
  } else {
    console.log(`  ✓ Collected ${resolved.length} direct video sources`);
  }

  return results;
}

export async function collectIframeSourcesForServers(page: Page, servers: ScrapedServer[]): Promise<ScrapedServer[]> {
  const resultMap = new Map<string, ScrapedServer>();
  const upsert = (entry: ScrapedServer): void => {
    const normalized: ScrapedServer = {
      server: entry.server,
      quality: entry.quality,
      url: entry.url || '',
      type: entry.type || 'video'
    };
    resultMap.set(serverKey(normalized.server, normalized.quality), normalized);
  };

  const directSources = await collectVideoSourcesFromPlayerOptions(page);
  directSources.forEach(upsert);

  for (const entry of servers) {
    const key = serverKey(entry.server, entry.quality);
    const existing = resultMap.get(key);
    if (existing) {
      if (!existing.url && entry.url) {
        upsert(entry);
      }
    } else {
      upsert(entry);
    }
  }

  const unresolved = Array.from(resultMap.values()).filter(entry => !entry.url);

  if (!unresolved.length) {
    return Array.from(resultMap.values());
  }

  try {
    await page.waitForSelector(SERVER_BUTTON_WAIT_SELECTOR, { timeout: BUTTON_MATCH_TIMEOUT_MS });
  } catch {
    console.log('  ⚠️ Server buttons not detected within timeout, continuing with best effort');
  }

  for (const server of unresolved) {
    const key = serverKey(server.server, server.quality);
    if (resultMap.get(key)?.url) {
      continue;
    }

    let clicked = false;
    try {
      clicked = await page.evaluate(
        (selectors, targetServer, targetQuality) => {
          const normalize = (value: string) =>
            value ? value.toLowerCase().replace(/\s+/g, '') : '';
          const serverToken = normalize(targetServer);
          const qualityToken = normalize(targetQuality);
          let matched = false;

          const attemptClick = (element: Element): void => {
            if (matched) return;
            if (!(element instanceof HTMLElement)) return;

            const textContent = normalize(element.textContent || '');
            const dataServer = normalize(element.dataset?.server || '');
            const dataQuality = normalize(element.dataset?.quality || '');

            const serverMatches =
              serverToken.length === 0
                ? false
                : textContent.includes(serverToken) || dataServer === serverToken;
            const qualityMatches =
              qualityToken.length === 0
                ? false
                : textContent.includes(qualityToken) || dataQuality === qualityToken;

            if (serverMatches && qualityMatches) {
              element.scrollIntoView({ block: 'center', behavior: 'auto' });
              if (element instanceof HTMLAnchorElement) {
                element.removeAttribute('target');
              }
              element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              matched = true;
            }
          };

          for (const selector of selectors) {
            const elements = Array.from(document.querySelectorAll(selector));
            for (const element of elements) {
              attemptClick(element);
              if (matched) break;
            }
            if (matched) break;
          }

          return matched;
        },
        SERVER_BUTTON_SELECTORS,
        server.server,
        server.quality
      );
    } catch (error) {
      console.log(`  ⚠️ Failed to evaluate button click for ${server.server} ${server.quality}: ${(error as Error).message}`);
    }

    if (!clicked) {
      console.log(`  ⚠️ No matching button for ${server.server} ${server.quality}`);
      continue;
    }

    let iframeUrl = '';
    try {
      const previousSrc = await page.evaluate(() => {
        const current = document.querySelector('#player_embed iframe');
        if (!current) return '';
        const raw = current.getAttribute('src') || current.getAttribute('data-src') || '';
        return raw;
      });

      const iframeHandle = await page.waitForFunction(
        (prev: string) => {
          const container = document.querySelector('#player_embed');
          if (!container) return null;
          const iframe = container.querySelector('iframe');
          if (!iframe) return null;
          const raw = iframe.getAttribute('src') || iframe.getAttribute('data-src') || '';
          if (!raw) return null;
          const normalized = raw.startsWith('//') ? `https:${raw}` : raw;
          if (!normalized || normalized === prev) return null;
          return normalized;
        },
        { timeout: IFRAME_TIMEOUT_MS, polling: 200 },
        previousSrc
      );

      if (iframeHandle) {
        const iframeValue = await iframeHandle.jsonValue();
        iframeUrl = typeof iframeValue === 'string' ? iframeValue : '';
        await iframeHandle.dispose();
      }
    } catch (error) {
      console.log(`  ⚠️ Timeout waiting for iframe for ${server.server} ${server.quality}: ${(error as Error).message}`);
    }

    if (!iframeUrl) {
      iframeUrl = await page.evaluate(() => {
        const candidates = [
          '#player_embed iframe',
          'iframe[src*="embed"]',
          'iframe[src*="player"]',
          'iframe[src*="video"]',
          '.player iframe',
          '#player iframe',
          'iframe'
        ];

        for (const selector of candidates) {
          const node = document.querySelector(selector) as HTMLIFrameElement | null;
          if (!node) continue;
          const raw = node.getAttribute('src') || node.getAttribute('data-src') || '';
          if (raw) {
            return raw.startsWith('//') ? `https:${raw}` : raw;
          }
        }
        return '';
      });
    }

    if (iframeUrl) {
      const normalizedUrl = normalizeIframeSrc(iframeUrl);
      resultMap.set(key, {
        ...server,
        url: normalizedUrl,
        type: server.type || 'video'
      });
      console.log(
        `  ✓ Captured ${server.server} ${server.quality}: ${normalizedUrl.substring(0, 80)}${
          normalizedUrl.length > 80 ? '...' : ''
        }`
      );
    } else {
      console.log(`  ⚠️ Iframe src missing for ${server.server} ${server.quality}`);
    }

    await delay(CLICK_DELAY_MS);
  }

  return Array.from(resultMap.values());
}

export class EpisodeScraper {
  /**
   * Get Episode Streaming Links
   * Dynamically detects all available streaming servers and qualities
   * Supports both episode slugs and anime slugs (will get latest episode)
   */
  static async getEpisodeLinks(episodeId: string): Promise<StreamServer[]> {
    console.log('🎬 EPISODE SCRAPER STARTED - Episode ID:', episodeId);
    const cacheKey = `episode:links:${episodeId}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        const cleanId = episodeId.replace(/\/+$/, '');
        let targetUrl = cleanId;

        // Check if this is an anime slug (no episode indicator)
        if (!cleanId.includes('episode') && !cleanId.includes('-ep-')) {
          targetUrl = await this.findLatestEpisodeSlug(cleanId);
        }

        // Fetch and parse the episode page
        const servers = await this.scrapeEpisodePage(targetUrl);
        return this.convertToStreamServers(servers, targetUrl);
      } catch (error) {
        console.error('❌ Failed to scrape episode links:', error);
        throw new Error(`Failed to scrape episode links: ${error}`);
      }
    }, getCacheTTL('DYNAMIC') / 1000);
  }

  /**
   * Get Episode Data with metadata and streaming servers
   * Returns episode metadata and all detected servers dynamically with direct video URLs
   */
  static async getEpisodeData(episodeId: string): Promise<import('@/types/anime').EpisodeData> {
    const cacheKey = `episode:data:${episodeId}`;

    return cacheManager.getOrSet(cacheKey, async () => {
      try {
        const cleanId = episodeId.replace(/\/+$/, '');
        let targetUrl = cleanId;

        if (!cleanId.includes('episode') && !cleanId.includes('-ep-')) {
          targetUrl = await this.findLatestEpisodeSlug(cleanId);
        }

        // Use DynamicEpisodeScraper for episode data extraction
        const { DynamicEpisodeScraper } = await import('./dynamicEpisodeScraper');
        return await DynamicEpisodeScraper.scrape(targetUrl);
      } catch (error) {
        console.error('❌ Failed to scrape episode data:', error);
        throw new Error(`Failed to scrape episode data: ${error}`);
      }
    }, getCacheTTL('DYNAMIC') / 1000);
  }

  /**
   * Get Episode Streaming Servers with server/quality format (legacy method)
   * Returns all detected servers dynamically with direct video URLs
   */
  static async getEpisodeServersDirect(episodeId: string): Promise<ScrapedServer[]> {
    const episodeData = await this.getEpisodeData(episodeId);
    return episodeData.servers;
  }

  /**
   * Find latest episode slug from anime page
   */
  private static async findLatestEpisodeSlug(animeSlug: string): Promise<string> {
    try {
      const response = await axiosInstance.get(`/${animeSlug}`);
      const $ = load(response.data);

      let latestEpisodeUrl = '';
      let maxEpisodeNum = 0;

      // Look for episode links
      const episodeLinks = $('a[href*="-episode-"], a[href*="-ep-"]');

      episodeLinks.each((_: number, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        const href = $(el).attr('href');
        if (href) {
          let episodeNum = 0;
          const match1 = href.match(/-episode-(\d+)/);
          const match2 = href.match(/-ep-(\d+)/);

          if (match1) episodeNum = parseInt(match1[1]);
          else if (match2) episodeNum = parseInt(match2[1]);

          if (episodeNum > maxEpisodeNum) {
            maxEpisodeNum = episodeNum;
            latestEpisodeUrl = href;
          }
        }
      });

      if (latestEpisodeUrl) {
        const urlObj = new URL(latestEpisodeUrl, SITE_CONFIG.BASE_URL);
        return urlObj.pathname.replace(/^\//, '').replace(/\/$/, '');
      }

      throw new Error(`Could not find any episodes for anime: ${animeSlug}`);
    } catch (error) {
      throw new Error(`Failed to find latest episode: ${error}`);
    }
  }

  /**
   * Core scraping logic - extracts all servers and qualities dynamically
   * First tries Axios + Cheerio for speed, then falls back to Puppeteer for JS-heavy pages
   * Then extracts actual URLs from each server
   */
  private static async scrapeEpisodePage(episodeSlug: string): Promise<ScrapedServer[]> {
    try {
      console.log('📄 Fetching episode page:', episodeSlug);
      
      let servers: ScrapedServer[] = [];
      let axiosSucceeded = false;

      // Try Axios first
      try {
        const { data } = await axiosInstance.get(`/${episodeSlug}`);
        servers = this.extractServersFromHTML(data);
        
        if (servers.length > 0) {
          console.log(`✅ Found ${servers.length} servers with Axios`);
          axiosSucceeded = true;
        }
      } catch (axiosError: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (axiosError.response?.status === 403) {
          console.log('⚠️ Axios blocked with 403, falling back to Puppeteer...');
        } else {
          console.log('⚠️ Axios failed, falling back to Puppeteer...', axiosError.message);
        }
      }

      // Fallback to Puppeteer if Axios failed or found no servers
      if (!axiosSucceeded || servers.length === 0) {
        console.log('⚠️ Using Puppeteer for server detection...');
        servers = await this.scrapeWithPuppeteer(episodeSlug);
      }

      // Extract actual URLs from servers
      if (servers.length > 0) {
        console.log('🔗 Extracting server URLs...');
        servers = await this.extractServerUrlsWithPuppeteer(episodeSlug, servers);
      } else {
        console.log('⚠️ No servers detected from page');
      }

      return servers;
    } catch (error) {
      console.error('Error in scrapeEpisodePage:', error);
      throw error;
    }
  }

  /**
   * Scrape with Puppeteer for JavaScript-rendered pages
   */
  private static async scrapeWithPuppeteer(episodeSlug: string): Promise<ScrapedServer[]> {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      const session = await createOptimizedScrapingSession();
      browser = session.browser;
      page = session.page;

      const episodeUrl = `${SITE_CONFIG.BASE_URL}/${episodeSlug}/`;

      await navigateOptimized(page, episodeUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 25000
      });

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Scroll to trigger any lazy-loaded content
      await scrollOptimized(page, {
        scrollCount: 3,
        scrollDelay: 800,
        scrollAmount: 0.5
      });

      const content = await page.content();
      const servers = this.extractServersFromHTML(content);

      console.log(`✅ Found ${servers.length} servers with Puppeteer`);
      return servers;
    } catch (error) {
      console.error('❌ Puppeteer scraping failed:', error);
      return [];
    } finally {
      await cleanupBrowser(browser, page);
    }
  }

  /**
   * Extract server URLs by clicking each server button and capturing the dynamic iframe
   * This is the correct approach for Samehadaku's dynamic player system
   */
  private static async extractServerUrlsWithPuppeteer(episodeSlug: string, servers: ScrapedServer[]): Promise<ScrapedServer[]> {
    if (!servers.length) {
      return [];
    }

    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      const session = await createOptimizedScrapingSession({
        blockResources: false
      });
      browser = session.browser;
      page = session.page;

      const episodeUrl = `${SITE_CONFIG.BASE_URL}/${episodeSlug}/`;

      await navigateOptimized(page, episodeUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      console.log('🔗 Extracting URLs by clicking server buttons...');
      const updatedServers = await collectIframeSourcesForServers(page, servers);

      const successCount = updatedServers.filter((item) => item.url).length;
      const successRate =
        updatedServers.length > 0 ? ((successCount / updatedServers.length) * 100).toFixed(1) : '0.0';

      console.log(`✅ URL extraction complete: ${successCount}/${updatedServers.length} URLs found (${successRate}%)`);

      return updatedServers;
    } catch (error) {
      console.error('❌ URL extraction with Puppeteer failed:', error);
      return servers;
    } finally {
      await cleanupBrowser(browser, page);
    }
  }

  /**
   * Extract all servers and qualities from HTML
   * Dynamically detects any server/quality combination present in the page
   */
  static extractServersFromHTML(html: string): ScrapedServer[] {
    const $ = load(html);
    const servers: ScrapedServer[] = [];
    const seen = new Set<string>();

    // Quality patterns to recognize (case-insensitive)
    const qualityPattern = /(\d{3,4}p|4k|hd|sd|fullhd|uhd|fhd)/i;

    // Known streaming server names (lowercase for comparison)
    const knownServers = [
      'blogspot', 'premium', 'pixel', 'vidhide', 'kraken', 'krakenfiles',
      'mega', 'drive', 'wibufile', 'wibu', 'nakama', 'pucuk', 'pixeldrain',
      'acefile', 'gofile', 'mediafire', 'fembed', 'google drive'
    ];

    console.log('🔍 Scanning page for servers and qualities...');

    // Strategy 1: Extract from plain text nodes (most reliable)
    // Servers are typically listed as "ServerName Quality"
    const bodyText = $('body').text();
    const lines = bodyText.split(/\n|\r/);

    lines.forEach(line => {
      const cleanLine = line.trim();

      // Look for pattern: "[ServerName] [Quality]"
      for (const server of knownServers) {
        const serverRegex = new RegExp(`\\b${server}\\b\\s+(${qualityPattern.source})`, 'i');
        const match = cleanLine.match(serverRegex);

        if (match) {
          const serverName = cleanLine.split(/\s+/)[0]; // Get the actual server name from the line
          const quality = match[1].toLowerCase();
          const key = `${serverName.toLowerCase()}:${quality}`; // Normalize for deduplication

          if (!seen.has(key)) {
            seen.add(key);
            servers.push({
              server: serverName,
              quality: quality,
              url: '',
              type: 'video'
            });
            console.log(`  ✓ Found: ${serverName} ${quality}`);
          }
        }
      }
    });

    // Strategy 2: Check data attributes
    $('[data-server], [data-quality]').each((_: number, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const $el = $(el);
      const dataServer = $el.attr('data-server');
      const dataQuality = $el.attr('data-quality');
      const text = $el.text().trim();

      if (dataServer && dataQuality) {
        const key = `${dataServer.toLowerCase()}:${dataQuality.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          servers.push({
            server: dataServer,
            quality: dataQuality.toLowerCase(),
            url: '',
            type: 'video'
          });
          console.log(`  ✓ Found (data-attr): ${dataServer} ${dataQuality}`);
        }
      } else if (text && text.length < 50) {
        // Try to parse text content
        const textMatch = text.match(new RegExp(`(${knownServers.join('|')})\\s+(${qualityPattern.source})`, 'i'));
        if (textMatch) {
          const key = `${textMatch[1].toLowerCase()}:${textMatch[2].toLowerCase()}`;
          if (!seen.has(key)) {
            seen.add(key);
            servers.push({
              server: textMatch[1],
              quality: textMatch[2].toLowerCase(),
              url: '',
              type: 'video'
            });
            console.log(`  ✓ Found (element): ${textMatch[1]} ${textMatch[2]}`);
          }
        }
      }
    });

    // Strategy 3: Check button and link text content
    $('button, a, span, div').each((_: number, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const $el = $(el);
      const text = $el.text().trim();

      // Only look at short texts (likely server labels)
      if (text && text.length > 2 && text.length < 40) {
        // Check if text contains a known server and quality
        for (const server of knownServers) {
          const pattern = new RegExp(`\\b${server}\\b\\s+(${qualityPattern.source})`, 'i');
          const match = text.match(pattern);

          if (match) {
            const key = `${server.toLowerCase()}:${match[1].toLowerCase()}`;
            if (!seen.has(key)) {
              seen.add(key);
              servers.push({
                server: server.charAt(0).toUpperCase() + server.slice(1), // Capitalize first letter
                quality: match[1].toLowerCase(),
                url: '',
                type: 'video'
              });
              console.log(`  ✓ Found (button/link): ${server} ${match[1]}`);
            }
          }
        }
      }
    });

    // Strategy 4: Check script tags for JSON data
    $('script').each((_: number, el: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const content = $(el).html();
      if (!content) return;

      // Look for server patterns in JavaScript
      for (const server of knownServers) {
        // Match patterns like "server":"blogspot" or server=blogspot
        const patterns = [
          new RegExp(`["']?server["']?\\s*[=:]\\s*["']${server}["']`, 'gi'),
          new RegExp(`\\b${server}\\b`, 'gi')
        ];

        patterns.forEach(pattern => {
          const matches = content.match(pattern);
          if (matches && matches.length > 0) {
            // Extract qualities that appear near this server
            const qualityMatches = content.match(new RegExp(`${server}[^}]*?(${qualityPattern.source})`, 'gi'));
            if (qualityMatches) {
              qualityMatches.forEach(match => {
                const qMatch = match.match(qualityPattern);
                if (qMatch) {
                  const key = `${server.toLowerCase()}:${qMatch[1].toLowerCase()}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    servers.push({
                      server: server.charAt(0).toUpperCase() + server.slice(1), // Capitalize first letter
                      quality: qMatch[1].toLowerCase(),
                      url: '',
                      type: 'video'
                    });
                    console.log(`  ✓ Found (script): ${server} ${qMatch[1]}`);
                  }
                }
              });
            } else if (!seen.has(`${server.toLowerCase()}:hd`)) {
              // Default quality if not found
              seen.add(`${server.toLowerCase()}:hd`);
              servers.push({
                server: server.charAt(0).toUpperCase() + server.slice(1), // Capitalize first letter
                quality: 'hd',
                url: '',
                type: 'video'
              });
              console.log(`  ✓ Found (script-default): ${server} hd`);
            }
          }
        });
      }
    });

    // Remove duplicates and sort
    const uniqueServers = Array.from(new Map(
      servers.map(s => [`${s.server}:${s.quality}`, s])
    ).values());

    // Sort by server name then quality
    uniqueServers.sort((a, b) => {
      if (a.server !== b.server) return a.server.localeCompare(b.server);
      // Sort quality: 4k > 1080p > 720p > 480p > 360p > hd
      const qualityOrder: { [key: string]: number } = {
        '4k': 6, '1080p': 5, '720p': 4, '480p': 3, '360p': 2, 'hd': 1
      };
      return (qualityOrder[b.quality] || 0) - (qualityOrder[a.quality] || 0);
    });

    console.log(`📊 Total unique servers found: ${uniqueServers.length}`);
    return uniqueServers;
  }

  /**
   * Convert ScrapedServer to StreamServer format
   */
  private static convertToStreamServers(servers: ScrapedServer[], episodeSlug: string): StreamServer[] {
    return servers.map(server => {
      const normalizedQuality = server.quality || 'auto';
      const directUrl = normalizeStreamUrl(server.url);
      const hasDirectUrl = !!directUrl;

      return {
        name: `${server.server} ${normalizedQuality.toUpperCase()}`,
        url: hasDirectUrl ? directUrl : buildSiteUrl(episodeSlug),
        type: 'video',
        metadata: {
          server: server.server,
          quality: normalizedQuality,
          needsClientSideHandling: !hasDirectUrl,
          detectedFrom: hasDirectUrl ? 'dynamic_player_source' : 'dynamic_detection',
          directUrl: directUrl || undefined,
          isDirectPlayable: hasDirectUrl
        }
      };
    });
  }
}
