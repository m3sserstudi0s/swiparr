#!/usr/bin/env node
/**
 * doctor — is this checkout configured, and are its dependencies reachable?
 *
 * Prints one line per check and exits 1 if anything fails. Never prints a secret:
 * tokens and keys are reported as present/absent and by length only.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];

const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "ok  " : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

function readEnvFile(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
  return env;
}

const fileEnv = readEnvFile(path.join(ROOT, ".env"));
const env = { ...fileEnv, ...process.env };
const has = (key) => Boolean(env[key] && String(env[key]).trim());

// 1. Node version the toolchain expects
const major = Number(process.versions.node.split(".")[0]);
record("node >= 24", major >= 24, `v${process.versions.node}`);

// 2. Auth secret: production needs one, dev can generate it
record("AUTH_SECRET", has("AUTH_SECRET"), has("AUTH_SECRET") ? `${env.AUTH_SECRET.length} chars` : "missing — run scripts/ensure-auth-secret.cjs");

// 3. Provider and its endpoint
const provider = (env.PROVIDER || "jellyfin").toLowerCase();
record("PROVIDER", ["jellyfin", "emby", "plex", "tmdb"].includes(provider), provider);

if (provider !== "tmdb") {
  const url = env[`${provider.toUpperCase()}_URL`];
  record(`${provider.toUpperCase()}_URL`, Boolean(url), url || "missing");
}

// 4. TMDB token shape: a v4 JWT is ~239 chars, the v3 key is 34 and will 401
if (has("TMDB_ACCESS_TOKEN")) {
  const token = String(env.TMDB_ACCESS_TOKEN);
  record("TMDB_ACCESS_TOKEN shape", token.length > 100, `${token.length} chars (v4 JWT expected)`);
}

// 5. Database file exists and answers
const dbUrl = env.DATABASE_URL || "file:swiparr.db";
const dbPath = dbUrl.startsWith("file:") ? path.resolve(ROOT, dbUrl.slice(5)) : null;
if (dbPath) {
  record("database file", fs.existsSync(dbPath), path.relative(ROOT, dbPath) || dbPath);
} else {
  record("database file", true, "remote database — not checked here");
}

// 6. Migrations applied (the __drizzle_migrations table exists)
if (dbPath && fs.existsSync(dbPath)) {
  const { execFileSync } = await import("node:child_process");
  try {
    const out = execFileSync("sqlite3", [dbPath, "select count(*) from __drizzle_migrations;"], { encoding: "utf8" }).trim();
    record("migrations applied", Number(out) > 0, `${out} applied`);
  } catch {
    record("migrations applied", false, "no __drizzle_migrations table — run npm run db:migrate");
  }
}

// 7. Generated canon files match the design system's version
const theme = path.join(ROOT, "src/styles/messer/theme.css");
if (fs.existsSync(theme)) {
  const match = fs.readFileSync(theme, "utf8").match(/canon ([\d.]+)/);
  record("messer-ui canon", Boolean(match), match ? match[1] : "version stamp missing");
}

// 8. Version the container would report
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
record("package version", true, pkg.version);

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length === 0 ? "doctor: healthy" : `doctor: ${failed.length} problem(s)`}`);
process.exit(failed.length === 0 ? 0 : 1);
