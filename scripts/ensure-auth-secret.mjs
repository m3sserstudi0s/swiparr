import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import { config as dbConfig } from '../src/db/schema';

dotenv.config();

const getDefaultDbPath = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'file:/app/data/swiparr.db';
  }
  return 'file:swiparr.db';
};

const resolveDatabaseUrl = () => {
  return process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || getDefaultDbPath();
};

const resolveDatabaseAuthToken = () => {
  return process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
};

const ensureAuthSecret = async () => {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) {
    return;
  }

  const url = resolveDatabaseUrl();
  const authToken = resolveDatabaseAuthToken();

  const client = createClient({
    url,
    authToken,
  });

  const db = drizzle(client);

  try {
    const existing = await db
      .select()
      .from(dbConfig)
      .where(eq(dbConfig.key, 'auth_secret'))
      .limit(1);

    if (existing && existing.length > 0) {
      return;
    }

    const generated = crypto.randomUUID().repeat(2).slice(0, 32);
    await db.insert(dbConfig).values({ key: 'auth_secret', value: generated });
    console.log('[Auth] Generated AUTH_SECRET and stored in database.');
  } finally {
    client.close();
  }
};

ensureAuthSecret().catch((error) => {
  console.warn('[Auth] Failed to ensure AUTH_SECRET:', error);
});
