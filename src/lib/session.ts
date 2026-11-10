import { SessionOptions } from "iron-session";
import { SESSION_COOKIE } from "./constants";
import { getAuthSecret } from "./server/session-secret";
import { config } from "./config";

export async function getSessionOptions(): Promise<SessionOptions> {
  const shouldForceSecure = config.app.appPublicUrl?.startsWith("https://");
  return {
    password: await getAuthSecret(),
    // Renamed with the 2.0 brand flip. `proxy.ts` copies an existing legacy cookie onto this name,
    // so the rename logs nobody out.
    cookieName: SESSION_COOKIE,
    cookieOptions: {
      // Only use secure cookies if explicitly set, otherwise defaults to false
      // This ensures it works on local HTTP access (standard for home labs)
      secure: config.auth.secureCookies || !!shouldForceSecure,
      httpOnly: true,
      sameSite: "lax",
      path: config.app.basePath || "/",
    },
  };
}
