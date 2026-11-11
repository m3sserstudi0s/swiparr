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

async function wipeLegacyCryptoTokens() {
  // Security upgrade (C3/M8): v1 tokens were encrypted with a raw SHA-256-derived
  // key. They must be wiped so hosts re-encrypt under the new scrypt KDF (v2).
  try {
    const result = await client.execute(
      "UPDATE Session SET hostAccessToken = NULL, hostDeviceId = NULL WHERE hostAccessToken LIKE 'v1:%'"
    );
    if (result.rowsAffected > 0) {
      console.log(
        `[Security] Wiped ${result.rowsAffected} legacy v1-encrypted guest-lending token(s). ` +
        'Hosts will need to re-enable guest lending to re-encrypt under the new KDF.'
      );
    }
  } catch (error) {
    // Non-fatal: table may not exist yet on a fresh install
    console.warn('[Security] Could not wipe legacy tokens (safe to ignore on fresh install):', error.message);
  }
}

async function prefixLegacyTmdbIds() {
  // 2.0 typed the TMDB ids (`tmdb:movie:<id>`, `tmdb:tv:<id>`). Rows written by
  // earlier TMDB-mode installs hold bare numbers, which would never match a
  // typed id again — the user would re-see everything they already swiped.
  //
  // Only safe under PROVIDER=tmdb: Jellyfin/Emby ids are GUIDs and Plex
  // ratingKeys are ALSO bare numbers, so an unconditional prefix would rewrite
  // a Plex library's likes into TMDB ids. Numeric-only, colon-free rows only,
  // and skip any row that would collide with an already-typed one.
  if (process.env.PROVIDER !== 'tmdb') return;

  // Second guard: the app may have run under another provider on this same DB
  // (a switched install, or a household Jellyfin database). Session.provider
  // records who wrote it, so any non-tmdb session means these ids are not ours.
  try {
    const byProvider = await client.execute(
      'SELECT provider, COUNT(*) AS n FROM Session GROUP BY provider'
    );
    const foreign = byProvider.rows.filter((row) => row.provider && row.provider !== 'tmdb');
    if (foreign.length > 0) {
      console.warn(
        '[2.0] Skipping legacy TMDB id prefixing: this database carries sessions from ' +
          foreign.map((row) => `${row.provider} (${row.n})`).join(', ') +
          '. Bare numeric ids here may be that provider\'s, not TMDB\'s.'
      );
      return;
    }
  } catch (error) {
    console.warn('[2.0] Could not read Session.provider, skipping id prefixing:', error.message);
    return;
  }

  for (const table of ['Like', 'Hidden']) {
    try {
      const result = await client.execute(`
        UPDATE "${table}" AS legacy
        SET externalId = 'tmdb:movie:' || legacy.externalId
        WHERE legacy.externalId NOT LIKE '%:%'
          -- All digits and nothing else: a leading-digit test is not enough, because
          -- Jellyfin/Emby GUIDs are 32-char hex and often start with a digit.
          AND NOT legacy.externalId GLOB '*[^0-9]*'
          AND NOT EXISTS (
            SELECT 1 FROM "${table}" AS typed
            WHERE typed.externalId = 'tmdb:movie:' || legacy.externalId
              AND typed.externalUserId = legacy.externalUserId
              AND typed.kind = legacy.kind
              AND (
                (typed.sessionCode IS NULL AND legacy.sessionCode IS NULL)
                OR typed.sessionCode = legacy.sessionCode
              )
          )
      `);
      if (result.rowsAffected > 0) {
        console.log(`[2.0] Prefixed ${result.rowsAffected} legacy TMDB id(s) in ${table}.`);
      }
    } catch (error) {
      console.warn(`[2.0] Could not prefix legacy TMDB ids in ${table}:`, error.message);
    }
  }
}

async function main() {
  console.log('Running migrations...');
  try {
    const migrationsFolder = path.join(process.cwd(), 'src', 'db', 'migrations');
    console.log('Migrations folder:', migrationsFolder);
    await migrate(db, { migrationsFolder });
    console.log('Migrations complete!');
    await wipeLegacyCryptoTokens();
    await prefixLegacyTmdbIds();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
