import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL?.replace("file:", "") || "swiparr.db";
const sqlite = new Database(connectionString);
const db = drizzle(sqlite);

console.log('Running migrations...');

// migrationsFolder should point to the drizzle directory
// In production, we'll copy it to the root or a known location
migrate(db, { migrationsFolder: path.join(process.cwd(), 'src', 'db', 'migrations') });

console.log('Migrations complete!');
sqlite.close();
