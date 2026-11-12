import { connection, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

// Readiness must be answered per request, never from a prerendered body.

/**
 * Readiness: can this instance serve a deck?
 *
 * The one dependency that has to be up is the database (sessions, likes, hidden).
 * The provider is not probed here: it is per-user credentials, and a Jellyfin
 * outage must not make the container look dead to Komodo.
 */
export async function GET() {
  await connection();
  try {
    await db.run(sql`SELECT 1`);
    return NextResponse.json({ status: "ready", database: "connected" }, { status: 200 });
  } catch {
    // No error detail: a readiness body is served to anyone who can reach it.
    return NextResponse.json({ status: "unready", database: "unavailable" }, { status: 503 });
  }
}
