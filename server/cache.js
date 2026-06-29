const redis = require('./config/redis');

function cacheMiddleware(key, ttl = 300) {
  return async (req, res, next) => {
    try {
      const cacheKey = `${key}:${req.originalUrl}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        return res.json(JSON.parse(cached));
      }

      const originalJson = res.json.bind(res);
      res.json = (data) => {
        redis.setEx(cacheKey, ttl, JSON.stringify(data)).catch(() => {});
        return originalJson(data);
      };

      next();
    } catch (err) {
      next();
    }
  };
}

async function clearCache(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(keys);
    }
  } catch (err) {
    console.log('Clear cache error:', err);
  }
}

module.exports = { cacheMiddleware, clearCache };
