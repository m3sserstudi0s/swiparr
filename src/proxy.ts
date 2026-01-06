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

  // 1. Define public paths. 
  // We check for the path WITH the base path.
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

    // Next.js automatically prepends basePath to internal URLs
    // if basePath is defined in next.config.js.
    // Use a relative path to the root of the app.
    const loginUrl = new URL("/login", request.url);
    
    // searchParams.set automatically handles URL encoding
    loginUrl.searchParams.set("callbackUrl", pathname + search); 

    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)"],
};