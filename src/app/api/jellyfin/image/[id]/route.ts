import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import axios from "axios";
import { getJellyfinUrl, getAuthenticatedHeaders } from "@/lib/jellyfin/api";
import { sessionOptions } from "@/lib/session";
import { SessionData } from "@/types/swiparr";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  
  let accessToken = token;
  let deviceId: string | undefined;
  
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!accessToken) {
    if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });
    accessToken = session.user.AccessToken;
    deviceId = session.user.DeviceId;
  } else if (session.isLoggedIn && session.user.AccessToken === accessToken) {
    deviceId = session.user.DeviceId;
  }

  const { id } = await params;
  const isUser = searchParams.get("type") === "user";
  const imageType = searchParams.get("imageType") || "Primary";
  const width = searchParams.get("width");
  const height = searchParams.get("height");
  const quality = searchParams.get("quality");
  const tag = searchParams.get("tag");
  
  let imageUrl = isUser 
    ? getJellyfinUrl(`/Users/${id}/Images/${imageType}`)
    : getJellyfinUrl(`/Items/${id}/Images/${imageType}`);

  const urlObj = new URL(imageUrl);
  if (width) urlObj.searchParams.set("maxWidth", width);
  if (height) urlObj.searchParams.set("maxHeight", height);
  if (quality) urlObj.searchParams.set("quality", quality);
  if (tag) urlObj.searchParams.set("tag", tag);
  imageUrl = urlObj.toString();


  try {
    // Stream the image from Jellyfin to the Browser
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer", // Important for images
      headers: (accessToken && deviceId) 
        ? getAuthenticatedHeaders(accessToken, deviceId)
        : (accessToken ? { "X-Emby-Token": accessToken } : {}),
    });

    const headers = new Headers();
    headers.set("Content-Type", response.headers["content-type"] || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(response.data, { headers });
  } catch (error) {
    return new NextResponse("Image not found", { status: 404 });
  }
}
