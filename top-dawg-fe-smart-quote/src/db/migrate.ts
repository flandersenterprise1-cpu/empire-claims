import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { connectionOptions } from './client';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  const sql = postgres(url, { ...connectionOptions(url), max: 1 });
  try {
    await migrate(drizzle(sql), { migrationsFolder: './drizzle' });
    console.log('Migrations applied.');
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
