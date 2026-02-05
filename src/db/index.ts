import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { config } from '@/lib/config';

if (config.db.isProduction) {
  console.log('[DB] Connecting to:', config.db.url.startsWith('libsql') ? 'Turso/LibSQL' : 'Local SQLite');
}

const client = createClient({
  url: config.db.url,
  authToken: config.db.authToken,
});

export const db = drizzle(client, { schema });
export { client };

