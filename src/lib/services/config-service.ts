import { db, config as configTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { config as appConfig } from "@/lib/config";
import { ProviderType } from "../providers/types";

const ADMIN_USER_ID_KEY = "admin_user_id";
const INCLUDED_LIBRARIES_KEY = "included_libraries";
const USE_STATIC_FILTER_VALUES_KEY = "use_static_filter_values";
const ACTIVE_PROVIDER_KEY = "active_provider";

export class ConfigService {
  static async getActiveProvider(): Promise<ProviderType> {
    if (appConfig.app.providerLock) {
      return appConfig.app.provider as ProviderType;
    }
    const config = await db.select().from(configTable).where(eq(configTable.key, ACTIVE_PROVIDER_KEY)).then((rows: any[]) => rows[0]);
    return (config?.value || appConfig.app.provider) as ProviderType;
  }

  static async setActiveProvider(provider: ProviderType): Promise<void> {
    if (appConfig.app.providerLock) return;
    await db.insert(configTable).values({
      key: ACTIVE_PROVIDER_KEY,
      value: provider,
    }).onConflictDoUpdate({
      target: configTable.key,
      set: { value: provider },
    });
  }

  static async getAdminUserId(provider?: string): Promise<string | null> {
    const key = provider ? `${ADMIN_USER_ID_KEY}:${provider.toLowerCase()}` : ADMIN_USER_ID_KEY;
    const adminConfig = await db.select().from(configTable).where(eq(configTable.key, key)).then((rows: any[]) => rows[0]);
    if (adminConfig) return adminConfig.value;

    if (provider) {
      const globalAdminConfig = await db.select().from(configTable).where(eq(configTable.key, ADMIN_USER_ID_KEY)).then((rows: any[]) => rows[0]);
      return globalAdminConfig?.value || null;
    }
    return null;
  }

  static async setAdminUserId(userId: string, provider: ProviderType): Promise<void> {
    const key = `${ADMIN_USER_ID_KEY}:${provider.toLowerCase()}`;
    await db.insert(configTable).values({
      key,
      value: userId,
    }).onConflictDoUpdate({
      target: configTable.key,
      set: { value: userId },
    });
  }

  static async getIncludedLibraries(): Promise<string[]> {
    const config = await db.select().from(configTable).where(eq(configTable.key, INCLUDED_LIBRARIES_KEY)).then((rows: any[]) => rows[0]);
    if (!config) return [];
    try {
      return JSON.parse(config.value);
    } catch (e) {
      return [];
    }
  }

  static async setIncludedLibraries(libraries: string[]): Promise<void> {
    await db.insert(configTable).values({
      key: INCLUDED_LIBRARIES_KEY,
      value: JSON.stringify(libraries),
    }).onConflictDoUpdate({
      target: configTable.key,
      set: { value: JSON.stringify(libraries) },
    });
  }

  static async getUseStaticFilterValues(): Promise<boolean> {
    const config = await db.select().from(configTable).where(eq(configTable.key, USE_STATIC_FILTER_VALUES_KEY)).then((rows: any[]) => rows[0]);
    return config?.value === "true";
  }

  static async setUseStaticFilterValues(useStatic: boolean): Promise<void> {
    await db.insert(configTable).values({
      key: USE_STATIC_FILTER_VALUES_KEY,
      value: useStatic ? "true" : "false",
    }).onConflictDoUpdate({
      target: configTable.key,
      set: { value: useStatic ? "true" : "false" },
    });
  }

  static async getUserSettings(userId: string): Promise<any> {
    const userSettingsEntry = await db.select().from(configTable).where(eq(configTable.key, `user_settings:${userId}`)).then((rows: any[]) => rows[0]);
    if (userSettingsEntry) {
        try {
            return JSON.parse(userSettingsEntry.value);
        } catch(e) {}
    }
    return null;
  }

  static async setUserSettings(userId: string, settings: any): Promise<void> {
    await db.insert(configTable).values({
        key: `user_settings:${userId}`,
        value: JSON.stringify(settings),
    }).onConflictDoUpdate({
        target: configTable.key,
        set: { value: JSON.stringify(settings) },
    });
  }
}
