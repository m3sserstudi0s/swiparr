import { config } from "@/lib/config";

export async function getAuthSecret(): Promise<string> {
  if (config.auth.secret && config.auth.secret.length >= 32) {
    return config.auth.secret;
  }

  const { db } = await import("@/db");
  const { config: dbConfig } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const result = await db.select().from(dbConfig).where(eq(dbConfig.key, "auth_secret")).limit(1);
  if (result && result.length > 0) {
    return result[0].value;
  }

  throw new Error("AUTH_SECRET is missing. Run the ensure-auth-secret step or set AUTH_SECRET in the environment.");
}
