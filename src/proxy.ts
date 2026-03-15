import { NextResponse, NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { config as appConfig } from "@/lib/config";
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  let { pathname, search } = request.nextUrl;
  const basePath = appConfig.app.basePath;

  // 1. Handle base path stripping
  // If the request has the basePath, strip it so the rest of the proxy/routing sees the clean path.
  let isRewritten = false;
  if (basePath && (pathname === basePath || pathname.startsWith(basePath + "/"))) {
    pathname = pathname.substring(basePath.length) || "/";
    isRewritten = true;
  }

  // Define public paths (after basePath stripping)
  const isPublicPath =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/og") ||
    pathname.startsWith("/opengraph-image") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/_next") ||
    pathname.includes("favicon.ico") ||
    pathname.includes("manifest.json") ||
    pathname.includes("manifest.webmanifest") ||
    pathname.endsWith("/sw.js") ||
    [".png", ".svg", ".ico"].some(ext => pathname.endsWith(ext));

  // 2. Prepare request for next-intl
  // We cannot easily clone NextRequest while retaining its type, but we can override the nextUrl
  // for the purpose of the intl middleware.
  const requestForIntl = new NextRequest(
    isRewritten ? new URL(pathname + search, request.url) : request.url,
    request
  );

  // 3. Apply next-intl middleware for NON-API routes
  // API routes should not be localized by next-intl
  let response: NextResponse;
  const isApiRoute = pathname.startsWith("/api/");
  
  if (!isApiRoute) {
    response = intlMiddleware(requestForIntl);
  } else {
    // For API routes, if we stripped the basePath, rewrite to the clean path. Otherwise, continue.
    response = isRewritten 
      ? NextResponse.rewrite(new URL(pathname + search, request.url))
      : NextResponse.next();
  }

  // 4. Handle Public Paths (skip auth)
  if (isPublicPath) {
    return response;
  }

  // 5. Authentication check
  const session = await getIronSession<SessionData>(request, response, await getSessionOptions());


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
    const callbackPath = `${basePath}${pathname}`;
    loginUrl.searchParams.set("callbackUrl", callbackPath + search);

    // Pass join param to login page so Join OG can be served
    const join = request.nextUrl.searchParams.get("join");
    if (join) {
      loginUrl.searchParams.set("join", join);
    }

    return NextResponse.redirect(loginUrl);
  }

  // Safeguard: Log out if provider lock is enabled and provider mismatch
  if (appConfig.app.providerLock && session.user?.provider !== appConfig.app.provider && !session.user?.isGuest) {
    session.destroy();
    
    if (pathname.includes("/api/")) {
        return new NextResponse(JSON.stringify({ error: "provider_mismatch" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
    }

    const loginUrl = new URL(`${basePath}/login`, request.url);
    loginUrl.searchParams.set("reason", "provider_mismatch");
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
  // Skip all internal paths (_next, _vercel), match everything else including /api
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
};