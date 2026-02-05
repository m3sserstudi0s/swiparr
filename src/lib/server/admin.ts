import { db, config as configTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { useRuntimeConfig } from "../runtime-config";

const ADMIN_USER_ID_KEY = "admin_user_id";
const INCLUDED_LIBRARIES_KEY = "included_libraries";
const USE_STATIC_FILTER_VALUES_KEY = "use_static_filter_values";

export async function getAdminUserId(provider?: string): Promise<string | null> {
    const key = provider ? `${ADMIN_USER_ID_KEY}:${provider.toLowerCase()}` : ADMIN_USER_ID_KEY;
    const adminConfig = await db.query.config.findFirst({
        where: eq(configTable.key, key),
    });

    if (adminConfig) return adminConfig.value;

    // Fallback to global admin if provider-specific one isn't set
    if (provider) {
        const globalAdminConfig = await db.query.config.findFirst({
            where: eq(configTable.key, ADMIN_USER_ID_KEY),
        });
        return globalAdminConfig?.value || null;
    }

    return null;
}

export async function isAdmin(userId: string, username?: string, provider?: string): Promise<boolean> {

    // 0. Check if provider has auth
    const config = useRuntimeConfig();
    const activeProvider = provider || config.provider;
    
    // For other providers, check capabilities if possible, otherwise default to true for Jellyfin/Plex/Emby
    if (activeProvider === config.provider) {
        if (!config.capabilities.hasAuth) return false;
    }

    // 1. Check if username matches provider-specific or global ADMIN_USERNAME env var
    if (username) {
        const providerAdminEnv = activeProvider ? process.env[`${activeProvider.toUpperCase()}_ADMIN_USERNAME`] : null;
        const globalAdminEnv = process.env.ADMIN_USERNAME;
        
        const targetAdmin = providerAdminEnv || globalAdminEnv;
        if (targetAdmin && username.toLowerCase() === targetAdmin.toLowerCase()) {
            return true;
        }
    }

    // 2. Check if userId matches the one in DB
    const adminUserId = await getAdminUserId(activeProvider);
    return adminUserId === userId;
}

export async function setAdminUserId(userId: string, provider?: string): Promise<boolean> {
    const activeProvider = provider || useRuntimeConfig().provider;
    
    // Don't allow setting admin for TMDB
    if (activeProvider === 'tmdb') return false;

    // Only allow setting if no admin exists for this provider
    const currentAdmin = await getAdminUserId(activeProvider);
    if (currentAdmin) return false;

    const key = activeProvider ? `${ADMIN_USER_ID_KEY}:${activeProvider.toLowerCase()}` : ADMIN_USER_ID_KEY;

    await db.insert(configTable).values({
        key,
        value: userId,
    }).onConflictDoUpdate({
        target: configTable.key,
        set: { value: userId },
    });

    return true;
}

export async function getIncludedLibraries(): Promise<string[]> {
    const config = await db.query.config.findFirst({
        where: eq(configTable.key, INCLUDED_LIBRARIES_KEY),
    });
    if (!config) return [];
    try {
        return JSON.parse(config.value);
    } catch (e) {
        return [];
    }
}

export async function setIncludedLibraries(libraries: string[]): Promise<void> {
    await db.insert(configTable).values({
        key: INCLUDED_LIBRARIES_KEY,
        value: JSON.stringify(libraries),
    }).onConflictDoUpdate({
        target: configTable.key,
        set: { value: JSON.stringify(libraries) },
    });
}

export async function getUseStaticFilterValues(): Promise<boolean> {
    const config = await db.query.config.findFirst({
        where: eq(configTable.key, USE_STATIC_FILTER_VALUES_KEY),
    });
    return config?.value === "true";
}

export async function setUseStaticFilterValues(useStatic: boolean): Promise<void> {
    await db.insert(configTable).values({
        key: USE_STATIC_FILTER_VALUES_KEY,
        value: useStatic ? "true" : "false",
    }).onConflictDoUpdate({
        target: configTable.key,
        set: { value: useStatic ? "true" : "false" },
    });
}
