import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getMediaProvider } from "@/lib/providers/factory";
import { db, userProfiles } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id === "undefined") {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const isUserType = searchParams.get("type") === "user";
  const imageType = searchParams.get("imageType") || "Primary";
  const tag = searchParams.get("tag");

  // Get session and credentials
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  
  let auth;
  try {
      auth = await getEffectiveCredentials(session);
  } catch (e) {
      // Guest or no-auth might fail, that's okay for some providers like TMDB
  }

  // 1. Handle Custom User Images (Prioritize)
  if (isUserType) {
    const customProfile = await db.query.userProfiles.findFirst({
      where: eq(userProfiles.userId, id),
    });

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

  // 2. Resolve Provider
  // Heuristic: If it's a numeric ID and we are not explicitly told a provider, it might be TMDB
  // but usually provider is determined by the session/auth.
  const providerType = searchParams.get("provider") || auth?.provider;
  const provider = getMediaProvider(providerType);

  // 3. Fetch Image from Provider
  try {
    const options: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        if (!["token", "imageType", "tag", "type", "provider"].includes(key)) {
            options[key] = value;
        }
    });

    // Special case for User images if provider doesn't support it directly in getImageUrl
    // but our providers now have a unified fetchImage.
    const response = await provider.fetchImage(id, isUserType ? "user" : imageType, tag || undefined, auth, options);

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
    console.error("Error proxying image:", error.message);
    
    // If it was a user image and provider failed, and we didn't have a custom one, return 404
    if (isUserType) {
        return new NextResponse("User image not found", { status: 404 });
    }
    
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
