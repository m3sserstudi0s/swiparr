import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import 'dotenv/config';

const getDefaultDbPath = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'file:/app/data/swiparr.db';
  }
  return 'file:swiparr.db';
};

const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || getDefaultDbPath();
const authToken = process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;

if (process.env.NODE_ENV === 'production') {
  console.log('[DB] Connecting to:', url.startsWith('libsql') ? 'Turso/LibSQL' : 'Local SQLite');
}

const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });
export { client };
