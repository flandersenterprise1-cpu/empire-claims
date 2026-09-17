import { describe, expect, it } from 'vitest';
import { inspectEnv } from '@/lib/env';

type Env = NodeJS.ProcessEnv;

const GOOD: Env = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://user:pw@db.example.com:5432/topdawg?sslmode=require',
  AUTH_SECRET: 'x'.repeat(48),
  AUTH_SESSION_HOURS: '12',
  QUOTE_RETENTION_DAYS: '30',
  SEED_ADMIN_PASSWORD: 'a-real-password-9134',
};

const names = (env: Env) => inspectEnv(env, true).map((p) => p.variable);

describe('inspectEnv', () => {
  it('passes a well-formed production environment', () => {
    expect(inspectEnv(GOOD, true)).toEqual([]);
  });

  it('rejects a missing database url and auth secret', () => {
    expect(names({} as Env)).toContain('DATABASE_URL');
    expect(names({} as Env)).toContain('AUTH_SECRET');
  });

  it('rejects the example secret, which anyone reading the repo knows', () => {
    expect(
      names({ ...GOOD, AUTH_SECRET: 'change-me-to-a-long-random-string-at-least-32-chars' }),
    ).toContain('AUTH_SECRET');
  });

  it('rejects a short secret', () => {
    expect(names({ ...GOOD, AUTH_SECRET: 'tooshort' })).toContain('AUTH_SECRET');
  });

  it('rejects a localhost database in production', () => {
    expect(names({ ...GOOD, DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/x' }))
      .toContain('DATABASE_URL');
  });

  it('requires ssl on a remote database, because health answers cross it', () => {
    expect(names({ ...GOOD, DATABASE_URL: 'postgres://u:p@db.example.com:5432/x' }))
      .toContain('DATABASE_URL');
  });

  it('refuses to let the fictional carrier into a production database', () => {
    expect(names({ ...GOOD, SEED_DEMO_CARRIER: 'true' })).toContain('SEED_DEMO_CARRIER');
  });

  it('rejects an example admin password', () => {
    expect(names({ ...GOOD, SEED_ADMIN_PASSWORD: 'ChangeMe!2024' })).toContain('SEED_ADMIN_PASSWORD');
  });

  it('rejects nonsense session and retention values', () => {
    expect(names({ ...GOOD, AUTH_SESSION_HOURS: 'soon' })).toContain('AUTH_SESSION_HOURS');
    expect(names({ ...GOOD, QUOTE_RETENTION_DAYS: '-1' })).toContain('QUOTE_RETENTION_DAYS');
  });

  it('is lenient in development so a fresh clone still runs', () => {
    const dev: Env = {
      NODE_ENV: 'development',
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/topdawg',
      AUTH_SECRET: 'x'.repeat(48),
    };
    expect(inspectEnv(dev, false)).toEqual([]);
  });
});
