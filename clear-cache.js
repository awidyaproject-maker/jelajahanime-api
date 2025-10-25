import { cacheManager } from './src/lib/cache.js';

// Clear the cache for the naruto search
const cacheKey = `anime:search:naruto:1`;
console.log(`Clearing cache for key: ${cacheKey}`);
cacheManager.delete(cacheKey);
console.log('Cache cleared successfully');