import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { SessionData } from "@/types/swiparr";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  
  // 1. Check existing session
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  const { pathname, search } = request.nextUrl; // Get search params

  // 2. Define public paths
  if (
    pathname.startsWith("/login") || 
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/_next") ||
    pathname.includes("favicon.ico") ||
    pathname.includes("manifest.json") ||
    pathname === "/sw.js" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return response;
  }

  if (!session.isLoggedIn) {
    // 3. Handle Unauthorized API requests
    if (pathname.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Include the current URL (with query params) as the callback
    // browse to /?join=ABCD -> Login -> Back to /?join=ABCD
    const basePath = (process.env.URL_BASE_PATH || "").replace(/\/$/, "");
    const loginUrl = new URL(`${basePath}/login`, request.url);
    // Encode the full original URL
    // pathname here does not include basePath
    loginUrl.searchParams.set("callbackUrl", basePath + pathname + search); 
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Apply this proxy to everything except static assets
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)"],
};