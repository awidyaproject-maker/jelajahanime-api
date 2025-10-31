import axios from 'axios';
import puppeteer, { Browser, Page } from 'puppeteer';

export interface PageContentResult {
  html: string;
  method: 'axios' | 'puppeteer';
  blocked: boolean;
}

/**
 * Fetches page content with Axios first, falls back to Puppeteer if blocked
 */
export async function fetchPageContent(url: string): Promise<PageContentResult> {
  // Try Axios first for fast static HTML loading
  try {
    console.log(`Attempting to fetch with Axios: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: 10000,
      maxRedirects: 5,
    });

    const html = response.data;
    const isBlocked = isCloudflareBlocked(html);

    if (!isBlocked) {
      console.log('Successfully fetched with Axios');
      return { html, method: 'axios', blocked: false };
    } else {
      console.log('Detected Cloudflare protection, falling back to Puppeteer');
    }
  } catch (axiosError) {
    console.log('Axios failed, falling back to Puppeteer:', axiosError instanceof Error ? axiosError.message : 'Unknown error');
  }

  // Fallback to Puppeteer
  return await fetchWithPuppeteer(url);
}

/**
 * Fetches page content using Puppeteer to bypass Cloudflare
 */
async function fetchWithPuppeteer(url: string): Promise<PageContentResult> {
  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    console.log(`Fetching with Puppeteer: ${url}`);

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
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });

    page = await browser.newPage();

    // Set comprehensive headers to mimic real browser
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0'
    });

    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Set viewport
    await page.setViewport({ width: 1366, height: 768 });

    // Navigate with retry logic for Cloudflare
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        await page.goto(url, {
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        break;
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) throw error;
        console.log(`Navigation attempt ${retryCount} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Wait for Cloudflare challenge to complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check if we're blocked or challenged
    const isBlocked = await page.evaluate(() => {
      const bodyText = document.body?.textContent?.toLowerCase() || '';
      return bodyText.includes('cloudflare') ||
             bodyText.includes('checking your browser') ||
             bodyText.includes('ddos protection') ||
             bodyText.includes('just a moment') ||
             document.title.toLowerCase().includes('access denied');
    });

    if (isBlocked) {
      console.log('Still detected protection, waiting longer...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Additional wait for dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Get the page content
    const html = await page.content();

    return { html, method: 'puppeteer', blocked: isBlocked };

  } catch (error) {
    console.error('Puppeteer fetch failed:', error);
    throw error;
  } finally {
    // Clean up browser and page
    if (page) await page.close();
    if (browser) await browser.close();
  }
}

/**
 * Checks if the HTML content indicates Cloudflare blocking
 */
function isCloudflareBlocked(html: string): boolean {
  const lowerHtml = html.toLowerCase();

  // Common Cloudflare blocking indicators
  const blockedIndicators = [
    'cloudflare',
    'checking your browser',
    'ddos protection',
    'just a moment',
    'please wait while we are checking your browser',
    'checking if the site connection is secure',
    '__cf_chl_jschl_tk__',
    'cf-browser-verification',
    'cf-challenge-running'
  ];

  return blockedIndicators.some(indicator => lowerHtml.includes(indicator));
}
