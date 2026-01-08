import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import 'dotenv/config';
import path from 'path';
import fs from 'fs';

const getDefaultDbPath = () => {
  if (process.env.NODE_ENV === 'production') {
    return '/app/data/swiparr.db';
  }
  return 'swiparr.db';
};

const connectionString = process.env.DATABASE_URL?.replace("file:", "") || getDefaultDbPath();

const globalForDb = global as unknown as { sqlite: Database.Database | undefined };

if (!globalForDb.sqlite) {
  console.log("DB connecting to:", path.resolve(connectionString));
  globalForDb.sqlite = new Database(connectionString);
  globalForDb.sqlite.pragma('foreign_keys = ON');
}

export const db = drizzle(globalForDb.sqlite, { schema });
