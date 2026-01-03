import { SessionOptions } from "iron-session";
import { getAuthSecret } from "./server/session-secret";

export const sessionOptions: SessionOptions = {
  password: getAuthSecret(),
  cookieName: "swiparr-session",
  cookieOptions: {
    // Only use secure cookies if explicitly set, otherwise defaults to false
    // This ensures it works on local HTTP access (standard for home labs)
    secure: process.env.USE_SECURE_COOKIES?.toLowerCase() === "true",
    httpOnly: true,
    sameSite: "lax",
  },
};
