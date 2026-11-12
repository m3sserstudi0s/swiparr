import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createClient, type Client } from "@libsql/client";

/**
 * The 2.0 kind migration has to survive real rows: `kind` is NOT NULL, the unique
 * indexes are rebuilt to include it, and a pre-2.0 database must come out the
 * other side with every existing like/hidden still readable as a movie.
 *
 * Runs the actual `.sql` file against an in-memory database, not a copy of it.
 */

const MIGRATION_SQL = readFileSync(
  new URL("./migrations/0013_media-kind.sql", import.meta.url),
  "utf8"
).split("--> statement-breakpoint");

// The pre-2.0 shape, from meta/0012_snapshot.json.
const PRE_2_0_SCHEMA = `
CREATE TABLE "Like" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "externalId" text NOT NULL,
  "externalUserId" text NOT NULL,
  "isMatch" integer DEFAULT false NOT NULL,
  "sessionCode" text,
  "createdAt" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX "Like_session_key" ON "Like" ("externalId","externalUserId","sessionCode") WHERE sessionCode IS NOT NULL;
CREATE UNIQUE INDEX "Like_solo_key" ON "Like" ("externalId","externalUserId") WHERE sessionCode IS NULL;
CREATE TABLE "Hidden" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "externalId" text NOT NULL,
  "externalUserId" text NOT NULL,
  "sessionCode" text
);
CREATE UNIQUE INDEX "Hidden_session_key" ON "Hidden" ("externalId","externalUserId","sessionCode") WHERE sessionCode IS NOT NULL;
CREATE UNIQUE INDEX "Hidden_solo_key" ON "Hidden" ("externalId","externalUserId") WHERE sessionCode IS NULL;
`;

async function legacyDbWithRows(): Promise<Client> {
  const client = createClient({ url: ":memory:" });
  await client.executeMultiple(PRE_2_0_SCHEMA);
  await client.executeMultiple(`
    INSERT INTO "Like" ("externalId","externalUserId","sessionCode","isMatch") VALUES
      ('550','host',NULL,0),
      ('8d6b1f2a-0000-0000-0000-000000000000','host','ABCD',1),
      ('550','guest','ABCD',1);
    INSERT INTO "Hidden" ("externalId","externalUserId","sessionCode") VALUES
      ('551','host',NULL);
  `);
  return client;
}

async function applyMigration(client: Client) {
  for (const statement of MIGRATION_SQL) {
    const sql = statement.trim();
    if (sql) await client.execute(sql);
  }
}

async function count(client: Client, table: string): Promise<number> {
  const result = await client.execute(`SELECT COUNT(*) AS n FROM "${table}"`);
  return Number(result.rows[0].n);
}

test("the migration preserves every pre-2.0 row as a movie", async () => {
  const client = await legacyDbWithRows();
  const likesBefore = await count(client, "Like");
  const hiddenBefore = await count(client, "Hidden");

  await applyMigration(client);

  assert.equal(await count(client, "Like"), likesBefore);
  assert.equal(await count(client, "Hidden"), hiddenBefore);

  for (const table of ["Like", "Hidden"]) {
    const rows = await client.execute(`SELECT kind FROM "${table}"`);
    assert.ok(rows.rows.length > 0);
    for (const row of rows.rows) assert.equal(row.kind, "movie");
  }
});

test("kind is NOT NULL with a movie default, so an insert cannot leave it empty", async () => {
  const client = await legacyDbWithRows();
  await applyMigration(client);
  await client.execute(
    `INSERT INTO "Like" ("externalId","externalUserId") VALUES ('999','nobody')`
  );
  const row = await client.execute(`SELECT kind FROM "Like" WHERE "externalId" = '999'`);
  assert.equal(row.rows[0].kind, "movie");
});

test("the same id can be liked as a movie and as a series", async () => {
  const client = await legacyDbWithRows();
  await applyMigration(client);

  // '550' already exists as a movie for the solo host row.
  await client.execute(
    `INSERT INTO "Like" ("externalId","externalUserId","kind") VALUES ('550','host','series')`
  );
  const rows = await client.execute(
    `SELECT kind FROM "Like" WHERE "externalId" = '550' AND "externalUserId" = 'host' AND "sessionCode" IS NULL ORDER BY kind`
  );
  assert.deepEqual(rows.rows.map((r) => r.kind), ["movie", "series"]);
});

test("the unique index still rejects a duplicate like of the same kind", async () => {
  const client = await legacyDbWithRows();
  await applyMigration(client);

  await assert.rejects(
    () =>
      client.execute(
        `INSERT INTO "Like" ("externalId","externalUserId","kind") VALUES ('550','host','movie')`
      ),
    /UNIQUE|constraint/i
  );
  await assert.rejects(
    () =>
      client.execute(
        `INSERT INTO "Like" ("externalId","externalUserId","sessionCode","kind") VALUES ('550','guest','ABCD','movie')`
      ),
    /UNIQUE|constraint/i
  );
});

test("solo and session rows are still separate indexes", async () => {
  const client = await legacyDbWithRows();
  await applyMigration(client);

  // Same user, same id, same kind — but one solo row and one session row.
  await client.execute(
    `INSERT INTO "Like" ("externalId","externalUserId","sessionCode","kind") VALUES ('550','host','ABCD','movie')`
  );
  const rows = await client.execute(
    `SELECT COUNT(*) AS n FROM "Like" WHERE "externalId" = '550' AND "externalUserId" = 'host'`
  );
  assert.equal(Number(rows.rows[0].n), 2);
});
