import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { config } from '@/lib/config';

// Ensure this client is only initialized in Node.js environments
const client = typeof window === 'undefined' 
  ? createClient({
      url: config.db.url,
      authToken: config.db.authToken,
    })
  : null as any;

export const db = typeof window === 'undefined'
  ? drizzle(client, { schema })
  : null as any;

export { client };


