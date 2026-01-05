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

if (!process.env.JELLYFIN_URL && !process.env.PLEX_URL) {
  console.error('ERROR: Neither JELLYFIN_URL nor PLEX_URL is set. Swiparr requires one of these to function.');
  process.exit(1);
}

const getDefaultDbPath = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/app/data/swiparr.db';
  }
  return 'swiparr.db';
};

const connectionString = process.env.DATABASE_URL?.replace("file:", "") || getDefaultDbPath();

let sqlite;
let db;

try {
  sqlite = new Database(connectionString);
  db = drizzle(sqlite);
} catch (error) {
  if (error.code === 'SQLITE_CANTOPEN') {
    const dbDir = path.dirname(connectionString);
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════════════');
    console.error('  ERROR: Unable to open or create the database file.');
    console.error('═══════════════════════════════════════════════════════════════════════');
    console.error('');
    console.error(`  Database path: ${connectionString}`);
    console.error('');
    console.error('  This is likely a permissions issue. The container runs as UID 1001.');
    console.error('');
    console.error('  To fix this, run one of the following commands on your host:');
    console.error('');
    console.error(`    sudo chown -R 1001:65533 ${dbDir}`);
    console.error('');
    console.error('  Or make the directory world-writable:');
    console.error('');
    console.error(`    sudo chmod -R a+rw ${dbDir}`);
    console.error('');
    console.error('═══════════════════════════════════════════════════════════════════════');
    console.error('');
    process.exit(1);
  }
  throw error;
}

console.log('Running migrations...');

// migrationsFolder should point to the drizzle directory
// In production, we'll copy it to the root or a known location
try {
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'db', 'migrations') });
  console.log('Migrations complete!');
} catch (error) {
  console.error('ERROR: Migration failed:', error.message);
  process.exit(1);
} finally {
  sqlite.close();
}
