import { NextRequest, NextResponse } from "next/server";
import { db, sessions } from "@/lib/db";
import { eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Simple in-process rate limiter (H3 – session enumeration prevention)
// Limits each IP to RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW_MS.
// This is sufficient for a single-process deployment. In a multi-process
// setup (e.g. multiple Node workers, like with Vercel), this is not efficient.
// ---------------------------------------------------------------------------
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateEntry>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }

  entry.count += 1;
  return false;
}

export async function GET(request: NextRequest) {
    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
        return NextResponse.json(
            { error: "Too many requests" },
            {
                status: 429,
                headers: { "Retry-After": String(Math.ceil(RATE_LIMIT_WINDOW_MS / 1000)) },
            }
        );
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code")?.toUpperCase();

    if (!code) {
        return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    const session = await db.query.sessions.findFirst({
        where: eq(sessions.code, code),
        columns: {
            provider: true,
        }
    });

    if (!session) {
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ provider: session.provider });
}
