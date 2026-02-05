import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { config as appConfig } from "@/lib/config";

export async function proxy(request: NextRequest) {
  const { search } = request.nextUrl;
  let pathname = request.nextUrl.pathname;
  const basePath = appConfig.app.basePath;
  let isRewritten = false;


  // Handle base path stripping for routing
  if (basePath && (pathname === basePath || pathname.startsWith(basePath + "/"))) {
    pathname = pathname.substring(basePath.length) || "/";
    isRewritten = true;
  }

  const response = isRewritten
    ? NextResponse.rewrite(new URL(pathname + search, request.url))
    : NextResponse.next();

  const session = await getIronSession<SessionData>(request, response, await getSessionOptions());

  // 1. Define public paths. 
  const isPublicPath =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/_next") ||
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
    // Always use the version with basePath for the callback URL so the browser can return correctly
    const callbackPath = `${basePath}${pathname}`;

    loginUrl.searchParams.set("callbackUrl", callbackPath + search);

    return NextResponse.redirect(loginUrl);
  }

  // Configurable Iframe Headers
  const xFrameOptions = appConfig.proxy.xFrameOptions;
  if (xFrameOptions.toUpperCase() !== 'DISABLED') {
    response.headers.set('X-Frame-Options', xFrameOptions);
  }

  const cspFrameAncestors = appConfig.proxy.cspFrameAncestors;
  response.headers.set('Content-Security-Policy', `frame-ancestors ${cspFrameAncestors}`);


  return response;
}

export const config = {
  matcher: ["/:path*"],
};