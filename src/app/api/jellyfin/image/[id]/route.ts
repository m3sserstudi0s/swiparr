import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getJellyfinUrl, getAuthenticatedHeaders, apiClient } from "@/lib/jellyfin/api";
import { sessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  
  let accessToken = token;
  let deviceId: string | undefined;
  
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!accessToken) {
    if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });
    const creds = await getEffectiveCredentials(session);
    accessToken = creds.accessToken || "";
    deviceId = creds.deviceId;
  } else if (session.isLoggedIn && session.user.AccessToken === accessToken) {
    deviceId = session.user.DeviceId;
  }

  const isUser = searchParams.get("type") === "user";
  const imageType = searchParams.get("imageType") || "Primary";
  
  // Get parameters from query string
  const width = searchParams.get("width") || searchParams.get("maxWidth");
  const height = searchParams.get("height") || searchParams.get("maxHeight");
  const quality = searchParams.get("quality") || "80";
  const format = searchParams.get("format") || "webp"; // Lowercase is safer
  const tag = searchParams.get("tag");
  
  let imageUrl = isUser 
    ? getJellyfinUrl(`/Users/${id}/Images/${imageType}`)
    : getJellyfinUrl(`/Items/${id}/Images/${imageType}`);

  const urlObj = new URL(imageUrl);
  
  // Apply resizing at the source (Jellyfin) to reduce bandwidth between Jellyfin and our server
  if (width) urlObj.searchParams.set("maxWidth", width);
  if (height) urlObj.searchParams.set("maxHeight", height);
  
  urlObj.searchParams.set("quality", quality);
  urlObj.searchParams.set("format", format);
  if (tag) urlObj.searchParams.set("tag", tag);
  
  imageUrl = urlObj.toString();

  try {
    const headers = (accessToken && deviceId) 
      ? getAuthenticatedHeaders(accessToken, deviceId)
      : (accessToken ? { "X-Emby-Token": accessToken } : {});

    // Use apiClient (axios) as we know it works in this environment's network config
    const response = await apiClient.get(imageUrl, {
      responseType: "arraybuffer",
      headers: headers as any,
    });

    const contentType = response.headers["content-type"] || "image/webp";
    
    // Return the buffer directly. Next.js Image optimizer will consume this.
    return new NextResponse(response.data, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error: any) {
    // If it's a 404 from Jellyfin, we return 404
    if (error.response?.status === 404) {
      return new NextResponse("Image not found", { status: 404 });
    }
    console.error("Error proxying image from Jellyfin:", error.message);
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
