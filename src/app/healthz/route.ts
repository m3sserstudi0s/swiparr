import { connection, NextResponse } from "next/server";

// With cacheComponents, a GET with no input is prerendered at build time, and a
// prerendered probe answers with whatever the build answered. Awaiting connection()
// opts this handler out of prerendering, so the answer is always the live one.

/**
 * Liveness: is the process answering?
 *
 * Deliberately does not touch the database — a liveness probe that fails when the
 * database is down restarts a healthy process. `/readyz` owns that question.
 */
export async function GET() {
  await connection();
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
