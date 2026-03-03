import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { getMediaProvider } from "@/lib/providers/factory";
import { AuthService } from "@/lib/services/auth-service";
import { db, userProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/logger";
import { ProviderType } from "@/lib/providers/types";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id === "undefined") {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const isUserType = searchParams.get("type") === "user";
  const imageType = searchParams.get("imageType") || "Primary";
  const tag = searchParams.get("tag") === "undefined" ? null : searchParams.get("tag");

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  
  let auth;
  try {
      auth = await AuthService.getEffectiveCredentials(session);
  } catch (e) {
      // Guest or no-auth might fail, that's okay for some providers like TMDB
  }

  if (isUserType) {
    const customProfile = await db.select().from(userProfiles).where(eq(userProfiles.userId, id)).then((rows: any[]) => rows[0]);
    if (customProfile?.image) {
      return new NextResponse(customProfile.image as any, {
        status: 200,
        headers: {
          "Content-Type": customProfile.contentType || "image/webp",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    }
  }

  // Always derive the provider from the authenticated session — never from a
  // client-supplied query parameter — to prevent provider-confusion attacks (M4).
  const providerType = auth?.provider;
  const provider = getMediaProvider(providerType);

  // If no tag is provided, some providers (like TMDB) might use the ID if it looks like a path
  const effectiveTag = tag || (providerType === ProviderType.TMDB ? id : undefined);

  if (!effectiveTag && !isUserType && providerType === ProviderType.TMDB) {
    return new NextResponse("Missing image tag", { status: 400 });
  }

  if ((providerType === ProviderType.PLEX || provider?.name === ProviderType.PLEX) && effectiveTag && effectiveTag.startsWith("http")) {
    try {
      provider.getImageUrl(id, isUserType ? "user" : (imageType as any), effectiveTag, auth);
    } catch (e: any) {
      return new NextResponse("External image host not allowed", { status: 400 });
    }
  }

  try {
    const options: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        if (!["token", "imageType", "tag", "type", "provider"].includes(key)) {
            options[key] = value;
        }
    });

    const response = await provider.fetchImage(id, isUserType ? "user" : imageType, effectiveTag || undefined, auth, options);

    return new NextResponse(response.data as any, {
      status: 200,
      headers: {
        "Content-Type": response.contentType,
        "Cache-Control": isUserType ? "no-cache, no-store, must-revalidate" : "public, max-age=31536000, immutable",
      },
    });

  } catch (error: any) {
    if (error.response?.status === 404) {
      return new NextResponse("Image not found", { status: 404 });
    }
    logger.error("Error proxying image:", error.message);
    if (isUserType) return new NextResponse("User image not found", { status: 404 });
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
