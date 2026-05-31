let redisClient = null;
const memoryCache = new Map();
const memoryCacheExpiries = new Map();

/**
 * Initialize Redis connection if package is available and client runs.
 */
export const initCache = async () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    // Attempt dynamic import of redis
    const redis = await import('redis');
    redisClient = redis.createClient({ url: redisUrl });
    
    redisClient.on('error', (err) => {
      console.warn('Redis Connection Error, falling back to Memory Cache:', err.message);
      redisClient = null; // Disable on error
    });

    await redisClient.connect();
    console.log('Successfully connected to Redis Cache.');
  } catch (err) {
    console.warn('Redis package or server is not available. Using local in-memory cache fallback.');
    redisClient = null;
  }
};

/**
 * Set cache value with TTL (time to live in seconds).
 */
export const setCache = async (key, value, ttlSeconds = 3600) => {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  
  if (redisClient) {
    try {
      await redisClient.set(key, serialized, { EX: ttlSeconds });
      return;
    } catch (err) {
      console.warn('Redis set failed, writing to memory cache:', err.message);
    }
  }

  // Memory Cache Fallback
  memoryCache.set(key, serialized);
  const expiryTime = Date.now() + ttlSeconds * 1000;
  memoryCacheExpiries.set(key, expiryTime);
};

/**
 * Get cache value.
 */
export const getCache = async (key, parseJson = false) => {
  if (redisClient) {
    try {
      const data = await redisClient.get(key);
      if (data) {
        return parseJson ? JSON.parse(data) : data;
      }
    } catch (err) {
      console.warn('Redis get failed, reading from memory cache:', err.message);
    }
  }

  // Memory Cache Fallback
  if (memoryCache.has(key)) {
    const expiry = memoryCacheExpiries.get(key);
    if (expiry && Date.now() > expiry) {
      // Expired: delete
      memoryCache.delete(key);
      memoryCacheExpiries.delete(key);
      return null;
    }
    
    const data = memoryCache.get(key);
    return parseJson ? JSON.parse(data) : data;
  }

  return null;
};

/**
 * Invalidate cache key.
 */
export const delCache = async (key) => {
  if (redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      console.warn('Redis delete failed, writing to memory cache:', err.message);
    }
  }

  memoryCache.delete(key);
  memoryCacheExpiries.delete(key);
};
