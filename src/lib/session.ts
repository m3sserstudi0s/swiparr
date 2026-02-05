import { SessionOptions } from "iron-session";
import { getAuthSecret } from "./server/session-secret";
import { config } from "./config";

export async function getSessionOptions(): Promise<SessionOptions> {
  return {
    password: await getAuthSecret(),
    cookieName: "swiparr-session",
    cookieOptions: {
      // Only use secure cookies if explicitly set, otherwise defaults to false
      // This ensures it works on local HTTP access (standard for home labs)
      secure: config.auth.secureCookies,
      httpOnly: true,
      sameSite: "lax",
      path: config.app.basePath || "/",
    },
  };
}

