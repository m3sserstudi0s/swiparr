import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { SessionData } from "./types/swiparr";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  
  // 1. Check existing session
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  const { pathname, search } = request.nextUrl; // Get search params

  // 2. Define Public Paths (Don't block these!)
  // - /login
  // - /api/auth (so the login fetch works)
  // - /_next (static assets)
  // - /favicon.ico
  if (
    pathname.startsWith("/login") || 
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.includes("favicon.ico")
  ) {
    return response;
  }

if (!session.isLoggedIn) {
    // Include the current URL (with query params) as the callback
    // browse to /?join=ABCD -> Login -> Back to /?join=ABCD
    const loginUrl = new URL("/login", request.url);
    // Encode the full original URL
    loginUrl.searchParams.set("callbackUrl", pathname + search); 
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Apply this middleware to everything except static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};