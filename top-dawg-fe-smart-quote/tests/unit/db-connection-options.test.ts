import { describe, expect, it } from 'vitest';
import { connectionOptions } from '@/db/client';

describe('connectionOptions', () => {
  it('requires TLS for a managed host', () => {
    expect(connectionOptions('postgres://u:p@ep-x.us-east-1.aws.neon.tech/db').ssl).toBe('require');
  });

  it('leaves a loopback database unencrypted', () => {
    expect(connectionOptions('postgres://postgres@127.0.0.1:5432/topdawg').ssl).toBeUndefined();
    expect(connectionOptions('postgres://postgres@localhost:5432/topdawg').ssl).toBeUndefined();
  });

  it('never overrides an explicit sslmode, including a deliberate opt-out', () => {
    expect(connectionOptions('postgres://u@db.internal/app?sslmode=require').ssl).toBeUndefined();
    expect(connectionOptions('postgres://u@db.internal/app?sslmode=disable').ssl).toBeUndefined();
  });

  it('caps the pool low enough for many serverless instances', () => {
    expect(connectionOptions('postgres://u@ep-x.aws.neon.tech/db').max).toBe(5);
  });

  it('does not throw on an unparseable URL', () => {
    expect(() => connectionOptions('not a url')).not.toThrow();
  });
});
