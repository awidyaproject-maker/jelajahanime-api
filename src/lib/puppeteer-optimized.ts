import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { getRandomUserAgent, SITE_CONFIG } from './config';

puppeteer.use(StealthPlugin());

/**
 * Optimized Puppeteer configuration for web scraping
 * Provides performance-optimized browser and page settings
 */

export interface PuppeteerConfig {
  headless?: boolean;
  timeout?: number;
  blockResources?: boolean;
  viewport?: { width: number; height: number };
  userAgent?: string;
}

/**
 * Optimized browser launch arguments for performance and Cloudflare bypass
 */
export const OPTIMIZED_BROWSER_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-infobars',
  '--window-position=0,0',
  '--ignore-certifcate-errors',
  '--ignore-certifcate-errors-spki-list',
  '--disable-speech-api',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-dev-shm-usage',
  '--disable-domain-reliability',
  '--disable-extensions',
  '--disable-features=AudioServiceOutOfProcess',
  '--disable-hang-monitor',
  '--disable-ipc-flooding-protection',
  '--disable-notifications',
  '--disable-offer-store-unmasked-wallet-cards',
  '--disable-popup-blocking',
  '--disable-print-preview',
  '--disable-prompt-on-repost',
  '--disable-renderer-backgrounding',
  '--disable-setuid-sandbox',
  '--disable-sync',
  '--hide-scrollbars',
  '--ignore-gpu-blacklist',
  '--metrics-recording-only',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--no-pings',
  '--no-sandbox',
  '--no-zygote',
  '--password-store=basic',
  '--use-gl=swiftshader',
  '--use-mock-keychain',
];

/**
 * Resource types to block for faster loading
 */
export const BLOCKED_RESOURCE_TYPES = [
  'image',
  'media',
  'font',
  'texttrack',
  'object',
  'beacon',
  'csp_report',
  'imageset',
];

/**
 * Resource URLs to block (analytics, ads, etc.)
 */
export const BLOCKED_RESOURCE_URLS = [
  /google-analytics\.com/,
  /googletagmanager\.com/,
  /doubleclick\.net/,
  /googlesyndication\.com/,
  /amazon-adsystem\.com/,
  /facebook\.com\/tr/,
  /connect\.facebook\.net/,
  /hotjar\.com/,
  /segment\.com/,
  /fullstory\.com/,
  /mixpanel\.com/,
  /chartbeat\.com/,
  /quantserve\.com/,
  /scorecardresearch\.com/,
  /adsystem\.amazonaws\.com/,
  /googletagservices\.com/,
  /googleadservices\.com/,
  /ads\.twitter\.com/,
  /analytics\.twitter\.com/,
  /ads\.linkedin\.com/,
  /px\.ads\.linkedin\.com/,
];

/**
 * Create an optimized Puppeteer browser instance
 */
export async function createOptimizedBrowser(config: PuppeteerConfig = {}): Promise<Browser> {
  const {
    headless = true,
    timeout = 25000, // Reduced from 30s for better performance
  } = config;

  return await puppeteer.launch({
    headless,
    args: OPTIMIZED_BROWSER_ARGS,
    timeout,
    // Performance optimizations
    ignoreDefaultArgs: ['--enable-automation'],
    // Memory and process optimizations
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
  });
}

/**
 * Configure a Puppeteer page for optimal scraping performance
 */
export async function configureOptimizedPage(
  page: Page,
  config: PuppeteerConfig = {}
): Promise<void> {
  const {
    blockResources = false, // Allow resources to load
    viewport = { width: 1366, height: 768 },
    userAgent = getRandomUserAgent(),
  } = config;

  // Set viewport
  await page.setViewport(viewport);

  // Set user agent
  await page.setUserAgent(userAgent);

  // Set optimized HTTP headers
  await page.setExtraHTTPHeaders({
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    'Referer': SITE_CONFIG.BASE_URL,
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0',
  });

  // Block resources for faster loading if enabled
  if (blockResources) {
    await page.setRequestInterception(true);

    page.on('request', (request) => {
      const resourceType = request.resourceType();
      const url = request.url();

      // Block unwanted resource types
      if (BLOCKED_RESOURCE_TYPES.includes(resourceType)) {
        request.abort();
        return;
      }

      // Block unwanted URLs
      if (BLOCKED_RESOURCE_URLS.some(pattern => pattern.test(url))) {
        request.abort();
        return;
      }

      // Allow the request
      request.continue();
    });
  }

  // Disable images for faster loading (additional optimization)
  await page.setJavaScriptEnabled(true);

  // Set default timeout
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(60000);
}

/**
 * Optimized page navigation with smart waiting
 */
export async function navigateOptimized(
  page: Page,
  url: string,
  options: {
    timeout?: number;
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    retries?: number;
  } = {}
): Promise<void> {
  const {
    timeout = 25000,
    waitUntil = 'domcontentloaded', // Faster than networkidle2
    retries = 1,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto(url, {
        waitUntil,
        timeout,
      });
      return; // Success
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Optimized scrolling for content loading
 */
export async function scrollOptimized(
  page: Page,
  options: {
    scrollCount?: number;
    scrollDelay?: number;
    scrollAmount?: number;
  } = {}
): Promise<void> {
  const {
    scrollCount = 3,
    scrollDelay = 800, // Reduced from 1000ms
    scrollAmount = 0.75, // Scroll 75% of viewport height
  } = options;

  for (let i = 0; i < scrollCount; i++) {
    await page.evaluate((amount) => {
      const scrollHeight = Math.floor(document.body.scrollHeight * amount);
      window.scrollTo(0, scrollHeight);
    }, scrollAmount);

    await new Promise(resolve => setTimeout(resolve, scrollDelay));
  }
}

/**
 * Wait for content with optimized timeout
 */
export async function waitForContentOptimized(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Clean up browser and page resources
 */
export async function cleanupBrowser(browser: Browser | null, page: Page | null): Promise<void> {
  if (page) {
    try {
      await page.close();
    } catch (error) {
      console.error('Error closing page:', error);
    }
  }

  if (browser) {
    try {
      await browser.close();
    } catch (error) {
      console.error('Error closing browser:', error);
    }
  }
}

/**
 * Create and configure a complete optimized scraping session
 */
export async function createOptimizedScrapingSession(
  config: PuppeteerConfig = {}
): Promise<{ browser: Browser; page: Page }> {
  const browser = await createOptimizedBrowser(config);
  const page = await browser.newPage();

  await configureOptimizedPage(page, config);

  return { browser, page };
}
