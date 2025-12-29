import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import axios from "axios";
import { getJellyfinUrl } from "@/lib/jellyfin/api";
import { sessionOptions } from "@/lib/session";
import { SessionData } from "@/types/swiparr";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const isUser = searchParams.get("type") === "user";
  const width = searchParams.get("width");
  const height = searchParams.get("height");
  const quality = searchParams.get("quality");
  
  let imageUrl = isUser 
    ? getJellyfinUrl(`/Users/${id}/Images/Primary`)
    : getJellyfinUrl(`/Items/${id}/Images/Primary`);

  const urlObj = new URL(imageUrl);
  if (width) urlObj.searchParams.set("maxWidth", width);
  if (height) urlObj.searchParams.set("maxHeight", height);
  if (quality) urlObj.searchParams.set("quality", quality);
  imageUrl = urlObj.toString();


  try {
    // Stream the image from Jellyfin to the Browser
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer", // Important for images
      headers: {
        // Pass auth if required by your Jellyfin config, usually images are public if access token is in query
        // But better to use header
        "X-Emby-Token": session.user.AccessToken, 
      },
    });

    const headers = new Headers();
    headers.set("Content-Type", response.headers["content-type"] || "image/jpeg");
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(response.data, { headers });
  } catch (error) {
    return new NextResponse("Image not found", { status: 404 });
  }
}