import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import axios from "axios";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getMediaProvider } from "@/lib/providers/factory";
import { config as appConfig } from "@/lib/config";
import { ProviderType } from "@/lib/providers/types";


export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id === "undefined" || id === "null") {
    return new NextResponse("Invalid ID", { status: 400 });
  }
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  
  let accessToken = token;
  let deviceId: string | undefined;
  let serverUrl: string | undefined;
  let providerType: string | undefined;
  
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

  if (!accessToken) {
    if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });
    try {
        const creds = await getEffectiveCredentials(session);
        accessToken = creds.accessToken || "";
        deviceId = creds.deviceId;
        serverUrl = creds.serverUrl;
        providerType = creds.provider;
    } catch (e) {
        // May fail if TMDB/no-auth, that's okay for public images
    }
  } else if (session.isLoggedIn && session.user.AccessToken === accessToken) {
    deviceId = session.user.DeviceId;
    serverUrl = session.user.providerConfig?.serverUrl;
    providerType = session.user.provider;
  }

  const isUser = searchParams.get("type") === "user";
  const imageType = searchParams.get("imageType") || "Primary";
  const tag = searchParams.get("tag");

  // Check for custom user profile picture first
  if (isUser) {
    const { getProfilePicture } = await import("@/lib/server/profile-picture");
    const customProfile = await getProfilePicture(id);
    if (customProfile && customProfile.image) {
      return new NextResponse(customProfile.image as any, {
        status: 200,
        headers: {
          "Content-Type": customProfile.contentType || "image/webp",
          "Cache-Control": "public, max-age=3600, must-revalidate",
        },
      });
    }
  }
  
  let provider = getMediaProvider(providerType);

  
  // Heuristic to detect if ID is likely TMDB (numeric or path-like) 
  // vs Jellyfin (usually UUID-like)
  const isNumeric = /^\d+$/.test(id);
  const isPath = id.startsWith('/');
  
  if ((isNumeric || isPath) && provider.name !== "tmdb") {
      // If we have a numeric ID but current provider is jellyfin, 
      // it might be a TMDB ID leaking through or vice versa.
      // For now, let's trust the configured provider unless it fails, 
      // but if provider is TMDB, we definitely use it.
  }

  // Jellyfin-specific user image handling
  let imageUrl = (isUser && provider.name === "jellyfin")
    ? (provider as any).getImageUrl(id, "user", undefined, { serverUrl }) 
    : provider.getImageUrl(id, imageType as any, tag || undefined, { serverUrl });

  if (!imageUrl && provider.name === "tmdb" && tag) {
      // Retry with tag if provider returned empty
      imageUrl = provider.getImageUrl(id, imageType as any, tag, { serverUrl });
  }

  if (!imageUrl) {
      return new NextResponse("Image not found", { status: 404 });
  }

  const urlObj = new URL(imageUrl, "http://n");
  
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
    const isTmdbImageUrl = imageUrl.includes("tmdb.org");

    if (provider.name === ProviderType.JELLYFIN && accessToken && !isTmdbImageUrl) {
        const { getAuthenticatedHeaders } = await import("@/lib/jellyfin/api");
        Object.assign(headers, getAuthenticatedHeaders(accessToken, deviceId || "Swiparr"));
    } else if (provider.name === "plex" && !isTmdbImageUrl) {
        const { getPlexHeaders } = await import("@/lib/plex/api");
        const token = accessToken || appConfig.PLEX_TOKEN;
        Object.assign(headers, getPlexHeaders(token || undefined));
    }


    // Use axios directly for external TMDB images, use apiClient for Jellyfin/Plex/Emby
    let response;
    if (isTmdbImageUrl) {
        response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    } else {
        const { apiClient } = await import("@/lib/jellyfin/api");
        const { plexClient } = await import("@/lib/plex/api");
        const { apiClient: embyClient } = await import("@/lib/emby/api");
        const client = provider.name === "plex" ? plexClient : provider.name === "emby" ? embyClient : apiClient;
        response = await client.get(imageUrl, {
          responseType: "arraybuffer",
          headers,
        });
    }

    const contentType = response.headers["content-type"] || "image/webp";
    
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": isUser ? "public, max-age=3600, must-revalidate" : "public, max-age=31536000, immutable",
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
