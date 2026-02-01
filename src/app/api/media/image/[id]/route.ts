import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { apiClient } from "@/lib/jellyfin/api";
import { sessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getMediaProvider } from "@/lib/providers/factory";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id === "undefined") {
    return new NextResponse("Invalid ID", { status: 400 });
  }
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  
  let accessToken = token;
  let deviceId: string | undefined;
  
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!accessToken) {
    if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });
    try {
        const creds = await getEffectiveCredentials(session);
        accessToken = creds.accessToken || "";
        deviceId = creds.deviceId;
    } catch (e) {
        // May fail if TMDB/no-auth, that's okay for public images
    }
  } else if (session.isLoggedIn && session.user.AccessToken === accessToken) {
    deviceId = session.user.DeviceId;
  }

  const isUser = searchParams.get("type") === "user";
  const imageType = searchParams.get("imageType") || "Primary";
  const tag = searchParams.get("tag");
  
  const provider = getMediaProvider();
  
  // Jellyfin-specific user image handling
  let imageUrl = (isUser && provider.name === "jellyfin")
    ? (provider as any).getImageUrl(id, "user") // Need to handle user images in provider
    : provider.getImageUrl(id, imageType as any, tag || undefined);

  const urlObj = new URL(imageUrl, "http://n"); // dummy base for relative URLs if any
  
  // Forward parameters
  searchParams.forEach((value, key) => {
    if (key !== "token" && key !== "imageType" && key !== "tag") {
        urlObj.searchParams.set(key, value);
    }
  });
  
  // If the provider returned a full URL, use it. If it was relative to jellyfin, getJellyfinUrl would have been used.
  // Our JellyfinProvider currently returns full URLs.
  imageUrl = urlObj.toString().replace("http://n/", "/");

  try {
    const headers: any = {};
    if (provider.name === "jellyfin" && accessToken) {
        const { getAuthenticatedHeaders } = await import("@/lib/jellyfin/api");
        Object.assign(headers, getAuthenticatedHeaders(accessToken, deviceId || "Swiparr"));
    }

    const response = await apiClient.get(imageUrl, {
      responseType: "arraybuffer",
      headers,
    });

    const contentType = response.headers["content-type"] || "image/webp";
    
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    if (error.response?.status === 404) {
      return new NextResponse("Image not found", { status: 404 });
    }
    console.error("Error proxying image:", error.message);
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
