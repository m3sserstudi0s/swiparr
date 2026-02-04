import { db } from "@/db";
import { config } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function getAuthSecret(): Promise<string> {
  // 1. Environment variable (highest priority)
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) {
    return process.env.AUTH_SECRET;
  }
  if (process.env.AUTHORS_SECRET && process.env.AUTHORS_SECRET.length >= 32) {
    return process.env.AUTHORS_SECRET;
  }

  try {
    // 2. Database (persistent fallback)
    const result = await db.select().from(config).where(eq(config.key, "auth_secret")).limit(1);
    if (result && result.length > 0) {
      return result[0].value;
    }

    // 3. Generate new and store in DB
    const newSecret = crypto.randomBytes(32).toString("hex");
    await db.insert(config).values({ key: "auth_secret", value: newSecret });
    console.log("[Auth] Generated new persistent AUTH_SECRET and stored in database.");
    return newSecret;
  } catch (e) {
    // Fallback if DB is not ready or fails
    console.warn("[Auth] Failed to get/set persistent AUTH_SECRET from DB, generating temporary session secret.");
    return crypto.randomBytes(32).toString("hex");
  }
}
