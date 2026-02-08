import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { getMediaProvider } from "@/lib/providers/factory";
import { AuthService } from "@/lib/services/auth-service";
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

  const providerType = searchParams.get("provider") || auth?.provider;
  const provider = getMediaProvider(providerType);

  try {
    const options: Record<string, string> = {};
    searchParams.forEach((value, key) => {
        if (!["token", "imageType", "tag", "type", "provider"].includes(key)) {
            options[key] = value;
        }
    });

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
    if (isUserType) return new NextResponse("User image not found", { status: 404 });
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
