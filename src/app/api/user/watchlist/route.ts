import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { getJellyfinUrl, getAuthenticatedHeaders, apiClient as jellyfinApiClient } from "@/lib/jellyfin/api";
import { getPlexUrl, getPlexHeaders, apiClient as plexApiClient } from "@/lib/plex/api";
import { cookies } from "next/headers";
import { SessionData } from "@/types/swiparr";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getRuntimeConfig } from "@/lib/runtime-config";

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
    const config = getRuntimeConfig();
    const isPlex = config.backend === 'plex';

    if (isPlex) {
      // Plex: Add/remove from watchlist using the rate endpoint
      // PUT /:/rate?key={itemId}&identifier=com.plexapp.plugins.library&rating={1|0}
      // Note: Plex watchlist is actually stored on plex.tv, not locally
      // For now, we'll use the "On Deck" or rating mechanism as a workaround
      // Plex doesn't have a direct local watchlist API like Jellyfin
      // Best we can do is rate the item (which marks it as "liked")
      const url = getPlexUrl(`/:/rate`);
      await plexApiClient.put(url, null, {
        params: {
          key: itemId,
          identifier: 'com.plexapp.plugins.library',
          rating: action === 'add' ? 10 : -1, // 10 = liked, -1 = remove rating
        },
        headers: getPlexHeaders(accessToken!),
      });
    } else if (useWatchlist) {
      // Kefwin Tweaks / Jellyfin Enhanced Watchlist
      // This uses the Likes property via the Item Rating endpoint
      // POST /Users/{userId}/Items/{itemId}/Rating?Likes=true
      const url = getJellyfinUrl(`/Users/${userId}/Items/${itemId}/Rating`);
      await jellyfinApiClient.post(
        url,
        null,
        { 
            params: { Likes: action === "add" },
            headers: getAuthenticatedHeaders(accessToken!, deviceId!)
        }
      );
    } else {
      // Standard Jellyfin Favorites
      const url = getJellyfinUrl(`/Users/${userId}/FavoriteItems/${itemId}`);
      if (action === "add") {
        await jellyfinApiClient.post(url, null, { headers: getAuthenticatedHeaders(accessToken!, deviceId!) });
      } else {
        await jellyfinApiClient.delete(url, { headers: getAuthenticatedHeaders(accessToken!, deviceId!) });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watchlist/Favorite Toggle Error", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
