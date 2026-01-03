import { db, config as configTable } from "@/lib/db";
import { eq } from "drizzle-orm";

const ADMIN_USER_ID_KEY = "admin_user_id";
const INCLUDED_LIBRARIES_KEY = "included_libraries";

export async function getAdminUserId(): Promise<string | null> {
    const adminConfig = await db.query.config.findFirst({
        where: eq(configTable.key, ADMIN_USER_ID_KEY),
    });
    return adminConfig?.value || null;
}

export async function isAdmin(userId: string): Promise<boolean> {
    const adminUserId = await getAdminUserId();
    return adminUserId === userId;
}

export async function setAdminUserId(userId: string): Promise<boolean> {
    // Only allow setting if no admin exists
    const currentAdmin = await getAdminUserId();
    if (currentAdmin) return false;

    await db.insert(configTable).values({
        key: ADMIN_USER_ID_KEY,
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
