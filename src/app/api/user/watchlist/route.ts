import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { getJellyfinUrl, getAuthenticatedHeaders, apiClient } from "@/lib/jellyfin/api";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  if (session.user.isGuest) {
    return NextResponse.json({ error: "Guests cannot modify watchlist/favorites" }, { status: 403 });
  }

  const { itemId, action, useWatchlist } = await request.json();

  if (!itemId) return new NextResponse("Missing itemId", { status: 400 });

  try {
    const { accessToken, deviceId, userId } = await getEffectiveCredentials(session);

    if (useWatchlist) {
      // Kefwin Tweaks / Jellyfin Enhanced Watchlist
      // This uses the Likes property via the Item Rating endpoint
      // POST /Users/{userId}/Items/{itemId}/Rating?Likes=true
      const url = getJellyfinUrl(`/Users/${userId}/Items/${itemId}/Rating`);
      await apiClient.post(
        url,
        null,
        { 
            params: { Likes: action === "add" },
            headers: getAuthenticatedHeaders(accessToken!, deviceId!)
        }
      );
    } else {
      // Standard Favorites
      const url = getJellyfinUrl(`/Users/${userId}/FavoriteItems/${itemId}`);
      if (action === "add") {
        await apiClient.post(url, null, { headers: getAuthenticatedHeaders(accessToken!, deviceId!) });
      } else {
        await apiClient.delete(url, { headers: getAuthenticatedHeaders(accessToken!, deviceId!) });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watchlist/Favorite Toggle Error", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
