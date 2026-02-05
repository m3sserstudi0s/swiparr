import { db } from "@/db";
import { config as dbConfig } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { config } from "@/lib/config";

export async function getAuthSecret(): Promise<string> {
  // 1. Environment variable (highest priority)
  if (config.auth.secret && config.auth.secret.length >= 32) {
    return config.auth.secret;
  }


  try {
    // 2. Database (persistent fallback)
    const result = await db.select().from(dbConfig).where(eq(dbConfig.key, "auth_secret")).limit(1);
    if (result && result.length > 0) {
      return result[0].value;
    }

    // 3. Generate new and store in DB
    const newSecret = crypto.randomBytes(32).toString("hex");
    await db.insert(dbConfig).values({ key: "auth_secret", value: newSecret });

    console.log("[Auth] Generated new persistent AUTH_SECRET and stored in database.");
    return newSecret;
  } catch (e) {
    // Fallback if DB is not ready or fails
    console.warn("[Auth] Failed to get/set persistent AUTH_SECRET from DB, generating temporary session secret.");
    return crypto.randomBytes(32).toString("hex");
  }
}
