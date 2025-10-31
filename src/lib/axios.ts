import axios from 'axios';
import { SITE_CONFIG, getRandomUserAgent } from './config';

const SAMEHADAKU_URL = SITE_CONFIG.BASE_URL;

// Simplified headers with essential anti-detection
const getHeaders = () => {
  return {
    'User-Agent': getRandomUserAgent(),
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Cache-Control': 'max-age=0',
    'Referer': SAMEHADAKU_URL + '/',
  };
};

// Minimal delay to avoid being too aggressive
const getMinimalDelay = () => Math.floor(Math.random() * 1000) + 500; // 0.5-1.5 seconds

export const axiosInstance = axios.create({
  baseURL: SAMEHADAKU_URL,
  timeout: SITE_CONFIG.API_TIMEOUT,
  headers: getHeaders(),
  withCredentials: true,
});

// Simplified request interceptor
axiosInstance.interceptors.request.use(async (config) => {
  // Minimal delay to simulate human behavior
  await new Promise(resolve => setTimeout(resolve, getMinimalDelay()));

  // Refresh headers
  Object.assign(config.headers, getHeaders());

  // Add timestamp to avoid cached responses
  if (config.url) {
    const separator = config.url.includes('?') ? '&' : '?';
    config.url += `${separator}_t=${Date.now()}`;
  }

  return config;
});

// Simplified response interceptor with basic retry
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    if (!config || !config.retry) {
      config.retry = 0;
    }

    // Retry on 403, 429, or 503 errors (max 2 retries)
    if (error.response && [403, 429, 503].includes(error.response.status) && config.retry < 2) {
      config.retry += 1;

      console.log(`Retrying request (attempt ${config.retry}) after 2s delay...`);

      await new Promise(resolve => setTimeout(resolve, 2000));

      // Update headers for retry
      Object.assign(config.headers, getHeaders());

      // Add extra timestamp
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
