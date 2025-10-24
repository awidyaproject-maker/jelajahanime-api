import rateLimit from 'express-rate-limit';

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

export const limiter = rateLimit({
  windowMs,
  max: maxRequests,
  message: 'Terlalu banyak request dari IP ini, coba lagi nanti.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting untuk health checks
    return req.url === '/api/health';
  },
});

// Limiter yang lebih ketat untuk search
export const searchLimiter = rateLimit({
  windowMs: 60000, // 1 menit
  max: 30,
  message: 'Terlalu banyak pencarian, coba lagi nanti.',
});

export default limiter;