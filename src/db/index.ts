import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import 'dotenv/config';
import path from 'path';

const connectionString = process.env.DATABASE_URL?.replace("file:", "") || "swiparr.db";
console.log("DB connecting to:", path.resolve(connectionString));

const sqlite = new Database(connectionString);
export const db = drizzle(sqlite, { schema });
