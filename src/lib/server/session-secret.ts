import { config } from "@/lib/config";

export async function getAuthSecret(): Promise<string> {
  // 1. Environment variable (highest priority - Recommended for Middleware compatibility)
  if (config.auth.secret && config.auth.secret.length >= 32) {
    return config.auth.secret;
  }

  // If in Edge Runtime, we cannot access the DB to generate/retrieve a secret
  if (process.env.NEXT_RUNTIME === 'edge') {
    // Return a stable fallback derived from other env vars if possible, 
    // or a temporary one (not ideal for persistent sessions)
    return "swiparr-fallback-secret-for-middleware-only";
  }

  try {
    const { db } = await import("@/db");
    const { config: dbConfig } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");

    // 2. Database (persistent fallback)
    const result = await db.select().from(dbConfig).where(eq(dbConfig.key, "auth_secret")).limit(1);
    if (result && result.length > 0) {
      return result[0].value;
    }

    // 3. Generate new and store in DB
    const newSecret = crypto.randomUUID().repeat(2).slice(0, 32);
    await db.insert(dbConfig).values({ key: "auth_secret", value: newSecret });

    console.log("[Auth] Generated new persistent AUTH_SECRET and stored in database.");
    return newSecret;
  } catch (e) {
    console.warn("[Auth] Failed to get/set persistent AUTH_SECRET from DB, generating temporary session secret.");
    return crypto.randomUUID().repeat(2).slice(0, 32);
  }
}
