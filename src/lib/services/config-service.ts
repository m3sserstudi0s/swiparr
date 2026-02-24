import "server-only";
import { db, config as configTable } from "@/lib/db";
import { revalidateTag } from "next/cache";
import { tagConfig, tagUserSettings } from "@/lib/cache-tags";
import { getCachedConfigValue, getCachedUserSettingsValue } from "@/lib/server/config-cache";
import { config as appConfig } from "@/lib/config";
import { ProviderType } from "../providers/types";

const ADMIN_USER_ID_KEY = "admin_user_id";
const INCLUDED_LIBRARIES_KEY = "included_libraries";
const USE_STATIC_FILTER_VALUES_KEY = "use_static_filter_values";
const ACTIVE_PROVIDER_KEY = "active_provider";

export class ConfigService {
  private static async getConfigValue(key: string): Promise<string | null> {
    return getCachedConfigValue(key);
  }

  private static async getUserSettingsValue(userId: string): Promise<string | null> {
    return getCachedUserSettingsValue(userId);
  }

  static async getActiveProvider(): Promise<ProviderType> {
    if (appConfig.app.providerLock) {
      return appConfig.app.provider as ProviderType;
    }
    const value = await this.getConfigValue(ACTIVE_PROVIDER_KEY);
    return (value || appConfig.app.provider) as ProviderType;
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
    revalidateTag(tagConfig(ACTIVE_PROVIDER_KEY), "max");
  }

  static async getAdminUserId(provider?: string): Promise<string | null> {
    const key = provider ? `${ADMIN_USER_ID_KEY}:${provider.toLowerCase()}` : ADMIN_USER_ID_KEY;
    const adminValue = await this.getConfigValue(key);
    if (adminValue) return adminValue;

    if (provider) {
      const globalAdminValue = await this.getConfigValue(ADMIN_USER_ID_KEY);
      return globalAdminValue || null;
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
    revalidateTag(tagConfig(key), "max");
  }

  static async getIncludedLibraries(): Promise<string[]> {
    const value = await this.getConfigValue(INCLUDED_LIBRARIES_KEY);
    if (!value) return [];
    try {
      return JSON.parse(value);
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
    revalidateTag(tagConfig(INCLUDED_LIBRARIES_KEY), "max");
  }

  static async getUseStaticFilterValues(): Promise<boolean> {
    const value = await this.getConfigValue(USE_STATIC_FILTER_VALUES_KEY);
    return value === "true";
  }

  static async setUseStaticFilterValues(useStatic: boolean): Promise<void> {
    await db.insert(configTable).values({
      key: USE_STATIC_FILTER_VALUES_KEY,
      value: useStatic ? "true" : "false",
    }).onConflictDoUpdate({
      target: configTable.key,
      set: { value: useStatic ? "true" : "false" },
    });
    revalidateTag(tagConfig(USE_STATIC_FILTER_VALUES_KEY), "max");
  }

  static async getUserSettings(userId: string): Promise<any> {
    const value = await this.getUserSettingsValue(userId);
    if (value) {
      try {
        return JSON.parse(value);
      } catch (e) {}
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
    revalidateTag(tagUserSettings(userId), "max");
  }
}
