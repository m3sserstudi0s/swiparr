import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getPlexUrl, getPlexHeaders, apiClient } from "@/lib/plex/api";
import { sessionOptions } from "@/lib/session";
import { SessionData } from "@/types/swiparr";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const searchParams = request.nextUrl.searchParams;
  const token = searchParams.get("token");
  
  let accessToken = token;
  
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);

  if (!accessToken) {
    if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });
    const creds = await getEffectiveCredentials(session);
    accessToken = creds.accessToken || "";
  }

  const { id } = await params;
  const imageType = searchParams.get("imageType") || "thumb";
  const width = searchParams.get("width");
  const height = searchParams.get("height");
  
  // Plex image endpoint
  // For thumb: /library/metadata/{id}/thumb
  // For art (backdrop): /library/metadata/{id}/art
  // For banner: /library/metadata/{id}/banner
  const imagePath = imageType === "Primary" ? "thumb" : 
                    imageType === "Backdrop" ? "art" : 
                    imageType === "Banner" ? "banner" : imageType;
  
  let imageUrl = getPlexUrl(`/library/metadata/${id}/${imagePath}`);

  const urlObj = new URL(imageUrl);
  urlObj.searchParams.set("X-Plex-Token", accessToken);
  if (width) urlObj.searchParams.set("width", width);
  if (height) urlObj.searchParams.set("height", height);
  imageUrl = urlObj.toString();


  try {
    // Stream the image from Plex to the Browser
    const response = await apiClient.get(imageUrl, {
      responseType: "arraybuffer", // Important for images
    });

    const headers = new Headers();
    headers.set("Content-Type", response.headers["content-type"] || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(response.data, { headers });
  } catch (error) {
    return new NextResponse("Image not found", { status: 404 });
  }
}
