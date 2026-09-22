import 'dotenv/config';
import postgres from 'postgres';
import { connectionOptions } from './client';

/** Drops and recreates the public schema. Development convenience only. */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset the database while NODE_ENV=production.');
  }
  const sql = postgres(url, { ...connectionOptions(url), max: 1 });
  try {
    await sql.unsafe('drop schema if exists public cascade; create schema public;');
    await sql.unsafe('drop schema if exists drizzle cascade;');
    console.log('Database reset. Run `npm run db:migrate` next.');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
