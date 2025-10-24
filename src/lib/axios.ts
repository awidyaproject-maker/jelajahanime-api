import axios, { AxiosRequestConfig } from 'axios';
import { SITE_CONFIG, getRandomUserAgent } from './config';

const SAMEHADAKU_URL = SITE_CONFIG.BASE_URL;

const userAgents = SITE_CONFIG.USER_AGENTS;

// Advanced anti-detection headers with different strategies
const getAdvancedHeaders = (strategy: 'default' | 'stealth' | 'mobile' = 'default') => {
  const userAgent = getRandomUserAgent();
  const isChrome = userAgent.includes('Chrome');
  const isFirefox = userAgent.includes('Firefox');
  const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
  const isEdge = userAgent.includes('Edg');

  let headers: Record<string, string> = {
    'User-Agent': userAgent,
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
    'Cache-Control': 'max-age=0',
    'Referer': SAMEHADAKU_URL + '/',
  };

  // Strategy-specific headers
  if (strategy === 'stealth') {
    headers = {
      ...headers,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Sec-Purpose': 'prefetch',
      'Pragma': 'no-cache',
    };
  } else if (strategy === 'mobile') {
    // Simulate mobile device
    headers = {
      ...headers,
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      'sec-ch-ua-mobile': '?1',
      'sec-ch-ua-platform': '"iOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
    };
  }

  // Add browser-specific headers
  if (isChrome || isEdge) {
    headers['sec-ch-ua'] = '"Chromium";v="118", "Google Chrome";v="118", "Not=A?Brand";v="99"';
    headers['sec-ch-ua-mobile'] = '?0';
    headers['sec-ch-ua-platform'] = '"Windows"';
  } else if (isFirefox) {
    headers['sec-ch-ua'] = '"Not_A Brand";v="99"';
    headers['sec-ch-ua-mobile'] = '?0';
    headers['sec-ch-ua-platform'] = '"Windows"';
  } else if (isSafari) {
    headers['sec-ch-ua'] = '"Chromium";v="118", "Google Chrome";v="118", "Not=A?Brand";v="99"';
    headers['sec-ch-ua-mobile'] = '?0';
    headers['sec-ch-ua-platform'] = '"macOS"';
  }

  return headers;
};

// Random delay function
const getRandomDelay = () => Math.floor(Math.random() * 3000) + 1000; // 1-4 seconds

export const axiosInstance = axios.create({
  baseURL: SAMEHADAKU_URL,
  timeout: SITE_CONFIG.API_TIMEOUT,
  headers: getAdvancedHeaders(),
  withCredentials: true, // Enable cookies
});

// Request interceptor with advanced anti-detection
axiosInstance.interceptors.request.use(async (config) => {
  // Add random delay to simulate human behavior (1-4 seconds)
  const delay = getRandomDelay();
  await new Promise(resolve => setTimeout(resolve, delay));

  // Update headers with default anti-detection strategy
  const freshHeaders = getAdvancedHeaders('default');
  Object.assign(config.headers, freshHeaders);

  // Add timestamp to avoid cached responses
  if (config.url) {
    const separator = config.url.includes('?') ? '&' : '?';
    config.url += `${separator}_t=${Date.now()}`;
  }

  return config;
});

// Response interceptor with retry logic and different strategies
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (!config || !config.retry) {
      config.retry = 0;
    }

    // Retry on 403, 429, or 503 errors with different strategies
    if (error.response && [403, 429, 503].includes(error.response.status) && config.retry < 3) {
      config.retry += 1;

      // Different strategies for each retry attempt
      let strategy: 'default' | 'stealth' | 'mobile' = 'default';
      let delay = Math.pow(2, config.retry - 1) * 1000 + Math.random() * 2000; // 1s, 2s, 4s + random

      if (config.retry === 1) {
        strategy = 'stealth';
        delay += 2000; // Extra delay for stealth mode
      } else if (config.retry === 2) {
        strategy = 'mobile';
        delay += 3000; // Extra delay for mobile mode
      }

      console.log(`Retrying request (attempt ${config.retry}, strategy: ${strategy}) after ${delay}ms delay...`);

      await new Promise(resolve => setTimeout(resolve, delay));

      // Update headers with new strategy
      const freshHeaders = getAdvancedHeaders(strategy);
      Object.assign(config.headers, freshHeaders);

      // Add extra timestamp for cache busting
      if (config.url) {
        const separator = config.url.includes('?') ? '&' : '?';
        const timestamp = Date.now() + Math.random() * 1000;
        config.url = config.url.split('?')[0] + `${separator}_t=${timestamp}`;
      }

      return axiosInstance(config);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;