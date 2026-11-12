import { NextResponse } from "next/server";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Liveness: is the process answering?
 *
 * Deliberately does not touch the database — a liveness probe that fails when the
 * database is down restarts a healthy process. `/readyz` owns that question.
 */
export async function GET() {
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return NextResponse.json({ status: "building" }, { status: 200 });
  }
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
