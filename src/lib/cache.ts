import NodeCache from 'node-cache';

const cache = new NodeCache({ 
  stdTTL: parseInt(process.env.CACHE_TTL_SECONDS || '3600', 10),
  checkperiod: 600 
});

export const cacheManager = {
  get: <T>(key: string): T | undefined => {
    return cache.get(key) as T | undefined;
  },
  
  set: <T>(key: string, value: T, ttl?: number): boolean => {
    return ttl ? cache.set(key, value, ttl) : cache.set(key, value);
  },
  
  delete: (key: string): number => {
    return cache.del(key);
  },
  
  flush: (): void => {
    cache.flushAll();
  },
  
  has: (key: string): boolean => {
    return cache.has(key);
  },
  
  getOrSet: async <T>(
    key: string, 
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> => {
    const cached = cache.get<T>(key);
    if (cached) {
      return cached;
    }
    
    const data = await fetchFn();
    if (ttl) {
      cache.set(key, data, ttl);
    } else {
      cache.set(key, data);
    }
    return data;
  }
};