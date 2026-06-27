export interface ApiConfig {
  mongoUri: string;
  mongoDb: string;
  port: number;
  host: string;
  /** Public render cache TTL (seconds) advertised via Cache-Control. */
  renderMaxAge: number;
  rateLimitMax: number;
  adminEmail: string;
  adminPassword: string;
  jwtSecret: string;
}

export function loadConfig(): ApiConfig {
  return {
    mongoUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017',
    mongoDb: process.env.MONGODB_DB ?? 'kidase',
    port: Number(process.env.PORT ?? 3001),
    host: process.env.HOST ?? '0.0.0.0',
    renderMaxAge: Number(process.env.RENDER_MAX_AGE ?? 60),
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 120),
    adminEmail: process.env.ADMIN_EMAIL ?? 'admin@church.org',
    adminPassword: process.env.ADMIN_PASSWORD ?? 'changeme',
    jwtSecret: process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  };
}
