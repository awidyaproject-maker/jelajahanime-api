/**
 * Configuration file for Samehadaku API
 * All site-specific configurations should be defined here for easy maintenance
 */

export const SITE_CONFIG = {
  // Main site URL - Change this if the site URL changes
  BASE_URL: process.env.NEXT_PUBLIC_SAMEHADAKU_URL || 'https://v1.samehadaku.how',

  // Site name and branding
  SITE_NAME: 'Samehadaku',
  SITE_DOMAIN: 'samehadaku.how',

  // API Configuration
  API_VERSION: '1.0',
  API_TIMEOUT: 30000, // 30 seconds

  // User agents for requests (helps avoid blocking) - Updated to 2024 versions
  USER_AGENTS: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/118.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.60',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/118.0',
  ],

  // Rate limiting
  RATE_LIMIT_REQUESTS: 10,
  RATE_LIMIT_WINDOW: 60 * 1000, // 1 minute

  // Cache configuration
  CACHE_TTL: {
    HOME: 5 * 60 * 1000, // 5 minutes
    ANIME_LIST: 10 * 60 * 1000, // 10 minutes
    ANIME_DETAIL: 30 * 60 * 1000, // 30 minutes
    SEARCH: 2 * 60 * 1000, // 2 minutes
    GENRES: 60 * 60 * 1000, // 1 hour
  },

  // Pagination defaults
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Quality options for streaming
  VIDEO_QUALITIES: ['360p', '480p', '720p', '1080p'],

  // Download servers
  DOWNLOAD_SERVERS: [
    'Mega.nz',
    'Google Drive',
    'MediaFire',
    'AceFile',
    'BayFiles',
    'LetsUpload',
    'ZippyShare',
    'SolidFiles'
  ],

  // Streaming servers
  STREAMING_SERVERS: [
    'Server 1',
    'Server 2',
    'Server 3',
    'Server 4',
    'Server 5'
  ]
} as const;

/**
 * Get a random user agent from the configured list
 */
export const getRandomUserAgent = (): string => {
  return SITE_CONFIG.USER_AGENTS[Math.floor(Math.random() * SITE_CONFIG.USER_AGENTS.length)];
};

/**
 * Validate if a URL belongs to the configured site
 */
export const isValidSiteUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes(SITE_CONFIG.SITE_DOMAIN);
  } catch {
    return false;
  }
};

/**
 * Build full URL from relative path
 */
export const buildSiteUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_CONFIG.BASE_URL}${cleanPath}`;
};

/**
 * Get cache TTL for specific data type
 */
export const getCacheTTL = (type: keyof typeof SITE_CONFIG.CACHE_TTL): number => {
  return SITE_CONFIG.CACHE_TTL[type];
};