import { SessionOptions } from "iron-session";
import { getAuthSecret } from "./server/session-secret";
import { config } from "./config";

export async function getSessionOptions(): Promise<SessionOptions> {
  const shouldForceSecure = config.app.appPublicUrl?.startsWith("https://");
  return {
    password: await getAuthSecret(),
    cookieName: "swiparr-session",
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
