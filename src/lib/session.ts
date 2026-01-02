import { SessionOptions } from "iron-session";

export const sessionOptions: SessionOptions = {
  password: process.env.AUTH_SECRET || process.env.AUTHORS_SECRET || "complex_password_at_least_32_characters_long",
  cookieName: "swiparr-session",
  cookieOptions: {
    // Only use secure cookies if explicitly set, otherwise defaults to false
    // This ensures it works on local HTTP access (standard for home labs)
    secure: process.env.USE_SECURE_COOKIES === "true",
    httpOnly: true,
  },
};