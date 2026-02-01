import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.AUTH_SECRET && !process.env.AUTHORS_SECRET) {
  console.log('INFO: AUTH_SECRET is not set. A persistent secret will be generated in the database.');
}

const provider = (process.env.PROVIDER || 'jellyfin').toLowerCase();

if (provider === 'jellyfin' && (!process.env.JELLYFIN_URL && !process.env.SERVER_URL)) {
  console.error('ERROR: JELLYFIN_URL is not set. Swiparr requires this to function with the jellyfin provider.');
  process.exit(1);
}

if (provider === 'tmdb' && !process.env.TMDB_ACCESS_TOKEN) {
  console.error('ERROR: TMDB_ACCESS_TOKEN is not set. Swiparr requires this to function with the tmdb provider.');
  process.exit(1);
}

if (provider === 'plex' && (!process.env.PLEX_URL && !process.env.SERVER_URL)) {
  console.error('ERROR: PLEX_URL is not set. Swiparr requires this to function with the plex provider.');
  process.exit(1);
}

const getDefaultDbPath = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/app/data/swiparr.db';
  }
  return 'swiparr.db';
};

const connectionString = process.env.DATABASE_URL?.replace("file:", "") || getDefaultDbPath();
const sqlite = new Database(connectionString);
const db = drizzle(sqlite);

console.log('Running migrations...');

// migrationsFolder should point to the drizzle directory
// In production, we'll copy it to the root or a known location
migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'db', 'migrations') });

console.log('Migrations complete!');
sqlite.close();
