import 'dotenv/config';

// Deterministic defaults so unit tests never depend on a developer's .env.
process.env.AUTH_SECRET ??= 'test-only-secret-value-that-is-long-enough-1234567890';
process.env.QUOTE_RETENTION_DAYS ??= '30';
