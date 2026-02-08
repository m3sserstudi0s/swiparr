import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { config } from '@/lib/config';

// Initialize variables as null
let client: any = null;
let dbInstance: any = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  // Next.js Middleware/Edge doesn't support local file access
  if (typeof window === 'undefined' && config.db.url?.startsWith('file:')) {
    // Check if we are in the edge runtime (where middleware runs)
    if (process.env.NEXT_RUNTIME === 'edge') {
        throw new Error('Database access with "file:" protocol is not supported in the Edge Runtime/Middleware. Ensure AUTH_SECRET is set in your environment variables.');
    }
  }

  if (!client) {
    if (config.db.url && !config.db.url.startsWith('file:') && !config.db.authToken) {
        console.warn('[DB] DATABASE_URL is remote but DATABASE_AUTH_TOKEN is missing. This may cause 401 errors.');
    }
    client = createClient({
      url: config.db.url,
      authToken: config.db.authToken,
    });
  }

  if (!dbInstance) {
    dbInstance = drizzle(client, { schema });
  }

  return dbInstance;
}

// Keep the export for compatibility, but make it a proxy or getter
export const db = new Proxy({} as any, {
  get(_, prop) {
    return getDb()[prop];
  }
});

export { client };
