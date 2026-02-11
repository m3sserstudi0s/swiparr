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

async function cleanupDuplicates(client) {
  console.log('Cleaning up duplicate interactions before migration...');
  try {
    // Cleanup Like table duplicates
    await client.execute(`
      DELETE FROM "Like" 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM "Like" 
        GROUP BY externalId, externalUserId, COALESCE(sessionCode, 'solo_mode')
      )
    `);

    // Cleanup Hidden table duplicates
    await client.execute(`
      DELETE FROM "Hidden" 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM "Hidden" 
        GROUP BY externalId, externalUserId, COALESCE(sessionCode, 'solo_mode')
      )
    `);
    console.log('Cleanup successful.');
  } catch (error) {
    console.warn('Cleanup warning (might be first-time migration):', error.message);
  }
}

async function main() {
  console.log('Running migrations...');
  try {
    await cleanupDuplicates(client);
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
