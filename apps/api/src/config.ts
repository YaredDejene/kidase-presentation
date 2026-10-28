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

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ApiConfig {
  const cfg: ApiConfig = {
    mongoUri: env.MONGODB_URI ?? 'mongodb://localhost:27017',
    mongoDb: env.MONGODB_DB ?? 'kidase',
    port: Number(env.PORT ?? 3001),
    host: env.HOST ?? '0.0.0.0',
    renderMaxAge: Number(env.RENDER_MAX_AGE ?? 60),
    rateLimitMax: Number(env.RATE_LIMIT_MAX ?? 120),
    adminEmail: env.ADMIN_EMAIL ?? 'admin@church.org',
    adminPassword: env.ADMIN_PASSWORD ?? 'changeme',
    jwtSecret: env.JWT_SECRET ?? 'dev-insecure-secret-change-me',
  };
  // The defaults above exist for local development only. In production a missing Secret key
  // must stop the pod (readiness fails, the rollout reports it) rather than run with a known password.
  if (env.NODE_ENV === 'production') {
    const weak = [
      cfg.jwtSecret === 'dev-insecure-secret-change-me' && 'JWT_SECRET',
      cfg.adminPassword === 'changeme' && 'ADMIN_PASSWORD',
      cfg.mongoUri.startsWith('mongodb://localhost') && 'MONGODB_URI',
    ].filter(Boolean);
    if (weak.length) throw new Error(`Refusing to start in production with default ${weak.join(', ')}`);
  }
  return cfg;
}
