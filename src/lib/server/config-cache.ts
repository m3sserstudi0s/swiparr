import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { db, config as configTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { tagConfig, tagUserSettings } from "@/lib/cache-tags";

function isBuildTime(): boolean {
  return process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;
}

export async function getCachedConfigValue(key: string): Promise<string | null> {
  "use cache";
  cacheLife({ revalidate: 300, stale: 60, expire: 3600 });
  cacheTag(tagConfig(key));

  if (isBuildTime()) return null;

  try {
    const config = await db
      .select()
      .from(configTable)
      .where(eq(configTable.key, key))
      .then((rows: any[]) => rows[0]);

    return config?.value ?? null;
  } catch (error) {
    console.warn("[config-cache] Failed to read config value.", error);
    return null;
  }
}

export async function getCachedUserSettingsValue(userId: string): Promise<string | null> {
  "use cache";
  cacheLife({ revalidate: 300, stale: 60, expire: 3600 });
  cacheTag(tagUserSettings(userId));

  if (isBuildTime()) return null;

  try {
    const config = await db
      .select()
      .from(configTable)
      .where(eq(configTable.key, `user_settings:${userId}`))
      .then((rows: any[]) => rows[0]);

    return config?.value ?? null;
  } catch (error) {
    console.warn("[config-cache] Failed to read user settings.", error);
    return null;
  }
}
