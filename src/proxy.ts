import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { SessionData } from "@/types/swiparr";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  
  // In Next.js middleware, request.nextUrl.pathname 
  // already includes the basePath if it's matched.
  const { pathname, search } = request.nextUrl; 
  const basePath = (process.env.URL_BASE_PATH || "").replace(/\/$/, "");

  // 1. Define public paths. 
  // We check for the path with and without the base path.
  const isPublicPath = 
    pathname.endsWith("/login") || 
    pathname.includes("/api/auth") ||
    pathname.includes("/api/health") ||
    pathname.includes("/_next") ||
    pathname.includes("favicon.ico") ||
    pathname.includes("manifest.json") ||
    pathname.endsWith("/sw.js") ||
    [".png", ".svg", ".ico"].some(ext => pathname.endsWith(ext));

  if (isPublicPath) {
    return response;
  }

  if (!session.isLoggedIn) {
    if (pathname.includes("/api/")) {
      return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Redirect to login within the base path
    const loginUrl = new URL(`${basePath}/login`, request.url);
    
    // searchParams.set automatically handles URL encoding
    // If pathname already starts with basePath, don't double it
    const callbackPath = (basePath && pathname.startsWith(basePath)) 
      ? pathname 
      : `${basePath}${pathname}`;
    
    loginUrl.searchParams.set("callbackUrl", callbackPath + search); 

    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)"],
};