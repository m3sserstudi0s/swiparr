import sharp from "sharp";
import { db, userProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function saveProfilePicture(userId: string, imageBuffer: Buffer, contentType: string) {
    // Process image: resize to 128x128 and convert to webp
    const processedImage = await sharp(imageBuffer)
        .resize(128, 128, {
            fit: 'cover',
            position: 'center'
        })
        .webp({ quality: 80 })
        .toBuffer();

    const updatedAt = new Date().toISOString();

    await db.insert(userProfiles)
        .values({
            userId,
            image: processedImage,
            contentType: 'image/webp',
            updatedAt,
        })
        .onConflictDoUpdate({
            target: userProfiles.userId,
            set: {
                image: processedImage,
                contentType: 'image/webp',
                updatedAt,
            }
        });

    return { success: true };
}

export async function getProfilePicture(userId: string) {
    const profile = await db.query.userProfiles.findFirst({
        where: eq(userProfiles.userId, userId),
    });

    return profile;
}

export async function deleteProfilePicture(userId: string) {
    await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
    return { success: true };
}
