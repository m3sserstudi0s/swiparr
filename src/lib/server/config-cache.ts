import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db, config as configTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { tagConfig, tagUserSettings } from "@/lib/cache-tags";

export async function getCachedConfigValue(key: string): Promise<string | null> {
  "use cache";
  cacheLife({ revalidate: 300, stale: 60, expire: 3600 });
  cacheTag(tagConfig(key));

  const config = await db
    .select()
    .from(configTable)
    .where(eq(configTable.key, key))
    .then((rows: any[]) => rows[0]);

  return config?.value ?? null;
}

export async function getCachedUserSettingsValue(userId: string): Promise<string | null> {
  "use cache";
  cacheLife({ revalidate: 300, stale: 60, expire: 3600 });
  cacheTag(tagUserSettings(userId));

  const config = await db
    .select()
    .from(configTable)
    .where(eq(configTable.key, `user_settings:${userId}`))
    .then((rows: any[]) => rows[0]);

  return config?.value ?? null;
}
