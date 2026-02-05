import { drizzle } from 'drizzle-orm/libsql';
import { migrate } from 'drizzle-orm/libsql/migrator';
import { createClient } from '@libsql/client';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const getDefaultDbPath = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'file:/app/data/swiparr.db';
  }
  return 'file:swiparr.db';
};

const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || getDefaultDbPath();
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

console.log('Connecting to database at:', url.split('@').pop()); // Hide token if present

const client = createClient({
  url,
  authToken,
});

const db = drizzle(client);

async function main() {
  console.log('Running migrations...');
  try {
    const migrationsFolder = path.join(process.cwd(), 'src', 'db', 'migrations');
    console.log('Migrations folder:', migrationsFolder);
    await migrate(db, { migrationsFolder });
    console.log('Migrations complete!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
