import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.AUTH_SECRET && !process.env.AUTHORS_SECRET) {
  console.log('INFO: AUTH_SECRET is not set. A persistent secret will be generated in the database.');
}

if (!process.env.JELLYFIN_URL) {
  console.error('ERROR: JELLYFIN_URL is not set. Swiparr requires this to function.');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL?.replace("file:", "") || "swiparr.db";
const sqlite = new Database(connectionString);
const db = drizzle(sqlite);

console.log('Running migrations...');

// migrationsFolder should point to the drizzle directory
// In production, we'll copy it to the root or a known location
migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'db', 'migrations') });

console.log('Migrations complete!');
sqlite.close();
