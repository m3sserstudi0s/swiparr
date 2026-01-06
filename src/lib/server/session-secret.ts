import { db } from "@/db";
import { config } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export function getAuthSecret(): string {
  // 1. Environment variable (highest priority)
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) {
    return process.env.AUTH_SECRET;
  }
  if (process.env.AUTHORS_SECRET && process.env.AUTHORS_SECRET.length >= 32) {
    return process.env.AUTHORS_SECRET;
  }

  try {
    // 2. Database (persistent fallback)
    const result = db.select().from(config).where(eq(config.key, "auth_secret")).get();
    if (result) {
      return result.value;
    }

    // 3. Generate new and store in DB
    const newSecret = crypto.randomBytes(32).toString("hex");
    db.insert(config).values({ key: "auth_secret", value: newSecret }).run();
    console.log("[Auth] Generated new persistent AUTH_SECRET and stored in database.");
    return newSecret;
  } catch (e) {
    // Fallback if DB is not ready or fails
    console.warn("[Auth] Failed to get/set persistent AUTH_SECRET from DB, generating temporary session secret.");
    return crypto.randomBytes(32).toString("hex");
  }
}

