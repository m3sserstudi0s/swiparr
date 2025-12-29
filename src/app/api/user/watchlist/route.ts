import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { getJellyfinUrl } from "@/lib/jellyfin/api";
import { cookies } from "next/headers";
import axios from "axios";
import { SessionData } from "@/types/swiparr";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { itemId, action, useWatchlist } = await request.json();

  if (!itemId) return new NextResponse("Missing itemId", { status: 400 });

  try {
    const userId = session.user.Id;
    const token = session.user.AccessToken;

    if (useWatchlist) {
      // Kefwin Tweaks / Jellyfin Enhanced Watchlist
      // This uses the Likes property via the Item Rating endpoint
      // POST /Users/{userId}/Items/{itemId}/Rating?Likes=true
      const url = getJellyfinUrl(`/Users/${userId}/Items/${itemId}/Rating`);
      await axios.post(
        url,
        null,
        { 
            params: { Likes: action === "add" },
            headers: { "X-Emby-Token": token } 
        }
      );
    } else {
      // Standard Favorites
      const url = getJellyfinUrl(`/Users/${userId}/FavoriteItems/${itemId}`);
      if (action === "add") {
        await axios.post(url, null, { headers: { "X-Emby-Token": token } });
      } else {
        await axios.delete(url, { headers: { "X-Emby-Token": token } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watchlist/Favorite Toggle Error", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
