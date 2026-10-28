import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/config';

const real = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb+srv://user:pw@cluster.example.net',
  JWT_SECRET: 'a-long-random-secret',
  ADMIN_PASSWORD: 'another-random-secret',
};

describe('loadConfig', () => {
  it('falls back to development defaults outside production', () => {
    expect(loadConfig({}).adminPassword).toBe('changeme');
  });

  it('refuses development defaults in production', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET, ADMIN_PASSWORD, MONGODB_URI/);
    expect(() => loadConfig({ ...real, JWT_SECRET: undefined })).toThrow(/default JWT_SECRET$/);
  });

  it('starts in production when every secret is set', () => {
    expect(loadConfig(real).jwtSecret).toBe(real.JWT_SECRET);
  });
});
