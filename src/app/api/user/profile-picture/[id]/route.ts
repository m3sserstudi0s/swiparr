import { NextRequest, NextResponse } from "next/server";
import { getProfilePicture } from "@/lib/server/profile-picture";
import { logger } from "@/lib/logger";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    if (!id) {
        return new NextResponse("User ID required", { status: 400 });
    }

    try {
        const profile = await getProfilePicture(id);

        if (!profile || !profile.image) {
            const url = new URL(`/api/media/image/${id}`, request.url);
            url.searchParams.set("type", "user");
            
            request.nextUrl.searchParams.forEach((value, key) => {
                if (key !== "type") url.searchParams.set(key, value);
            });

            return NextResponse.redirect(url);
        }

        const url = new URL(request.url);
        const hasVersion = url.searchParams.has("v");

        return new NextResponse(profile.image as any, {
            headers: {
                "Content-Type": profile.contentType || "image/webp",
                "Cache-Control": hasVersion 
                    ? "public, max-age=31536000, immutable" 
                    : "no-cache, no-store, must-revalidate",
            },
        });
    } catch (error) {
        logger.error("Error serving profile picture:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
