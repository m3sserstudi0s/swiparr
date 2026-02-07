import { db, config as configTable } from "@/lib/db";
import { eq } from "drizzle-orm";
import { config as appConfig } from "@/lib/config";
import { PROVIDER_CAPABILITIES, ProviderType } from "../providers/types";

const ADMIN_USER_ID_KEY = "admin_user_id";
const INCLUDED_LIBRARIES_KEY = "included_libraries";
const USE_STATIC_FILTER_VALUES_KEY = "use_static_filter_values";
const ACTIVE_PROVIDER_KEY = "active_provider";

export async function getActiveProvider(): Promise<ProviderType> {
    if (appConfig.app.providerLock) {
        return appConfig.app.provider as ProviderType;
    }

    if (typeof window !== 'undefined') {
        return appConfig.app.provider as ProviderType;
    }

    const config = await db.query.config.findFirst({
        where: eq(configTable.key, ACTIVE_PROVIDER_KEY),
    });

    return (config?.value || appConfig.app.provider) as ProviderType;
}

export async function setActiveProvider(provider: ProviderType): Promise<void> {
    if (appConfig.app.providerLock) return;
    if (typeof window !== 'undefined') return;

    await db.insert(configTable).values({
        key: ACTIVE_PROVIDER_KEY,
        value: provider,
    }).onConflictDoUpdate({
        target: configTable.key,
        set: { value: provider },
    });
}

export async function getAdminUserId(provider?: string): Promise<string | null> {
    if (typeof window !== 'undefined') return null;
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

export async function isAdmin(userId: string, username?: string, provider?: string, isGuest?: boolean): Promise<boolean> {
    if (isGuest) return false;

    // 0. Check if provider has auth
    const activeProvider = (provider || await getActiveProvider()) as ProviderType;
    const capabilities = PROVIDER_CAPABILITIES[activeProvider] || PROVIDER_CAPABILITIES[ProviderType.JELLYFIN];
    
    if (!capabilities.hasAuth) return false;

    // 1. Check if username matches provider-specific or global ADMIN_USERNAME env var
    if (username) {
        let targetAdmin = appConfig.auth.adminUsername;

        if (provider && provider !== appConfig.app.provider) {
            const p = provider.toLowerCase() as ProviderType;
            if (p === ProviderType.JELLYFIN) targetAdmin = appConfig.JELLYFIN_ADMIN_USERNAME || appConfig.ADMIN_USERNAME;
            else if (p === ProviderType.EMBY) targetAdmin = appConfig.EMBY_ADMIN_USERNAME || appConfig.ADMIN_USERNAME;
            else if (p === ProviderType.PLEX) targetAdmin = appConfig.PLEX_ADMIN_USERNAME || appConfig.ADMIN_USERNAME;
            else if (p === ProviderType.TMDB) targetAdmin = appConfig.TMDB_ADMIN_USERNAME || appConfig.ADMIN_USERNAME;
        }
        
        if (targetAdmin && username.toLowerCase() === targetAdmin.toLowerCase()) {
            return true;
        }
    }

    // 2. Check if userId matches the one in DB
    const adminUserId = await getAdminUserId(activeProvider);
    return adminUserId === userId;
}

export async function setAdminUserId(userId: string, provider?: string): Promise<boolean> {
    if (typeof window !== 'undefined') return false;
    const activeProvider = (provider || await getActiveProvider()) as ProviderType;
    const capabilities = PROVIDER_CAPABILITIES[activeProvider] || PROVIDER_CAPABILITIES[ProviderType.JELLYFIN];
    
    // Don't allow setting admin if provider doesn't have an admin panel
    if (!capabilities.isAdminPanel) return false;

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
    if (typeof window !== 'undefined') return [];
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
    if (typeof window !== 'undefined') return;
    await db.insert(configTable).values({
        key: INCLUDED_LIBRARIES_KEY,
        value: JSON.stringify(libraries),
    }).onConflictDoUpdate({
        target: configTable.key,
        set: { value: JSON.stringify(libraries) },
    });
}

export async function getUseStaticFilterValues(): Promise<boolean> {
    if (typeof window !== 'undefined') return false;
    const config = await db.query.config.findFirst({
        where: eq(configTable.key, USE_STATIC_FILTER_VALUES_KEY),
    });
    return config?.value === "true";
}

export async function setUseStaticFilterValues(useStatic: boolean): Promise<void> {
    if (typeof window !== 'undefined') return;
    await db.insert(configTable).values({
        key: USE_STATIC_FILTER_VALUES_KEY,
        value: useStatic ? "true" : "false",
    }).onConflictDoUpdate({
        target: configTable.key,
        set: { value: useStatic ? "true" : "false" },
    });
}
