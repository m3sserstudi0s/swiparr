import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { SessionData } from "@/types/swiparr";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);
  
  const { pathname, search } = request.nextUrl;
  const basePath = (process.env.URL_BASE_PATH || "").replace(/\/$/, "");

  // 1. Normalize the pathname by removing the basePath for checking
  // If pathname is "/swipe/login" and basePath is "/swipe", normalized is "/login"
  const normalizedPathname = pathname.startsWith(basePath) 
    ? pathname.replace(basePath, "") 
    : pathname;

  // 2. Define public paths (using normalized path)
  const isPublicPath = 
    normalizedPathname.startsWith("/login") || 
    normalizedPathname.startsWith("/api/auth") ||
    normalizedPathname.startsWith("/api/health") ||
    normalizedPathname.startsWith("/_next") ||
    normalizedPathname.includes("favicon.ico") ||
    normalizedPathname.includes("manifest.json") ||
    normalizedPathname === "/sw.js" ||
    [".png", ".svg", ".ico"].some(ext => normalizedPathname.endsWith(ext));

  if (isPublicPath) {
    return response;
  }

  // 3. Handle Unauthorized
  if (!session.isLoggedIn) {
    if (normalizedPathname.startsWith("/api/")) {
      return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Use URL object to construct the login redirect safely
    const loginUrl = new URL(`${basePath}/login`, request.url);
    
    // Construct the full callback path
    // We use the original pathname + search so the user returns exactly where they were
    loginUrl.searchParams.set("callbackUrl", pathname + search); 

    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.json).*)"],
};