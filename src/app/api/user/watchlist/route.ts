import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getMediaProvider } from "@/lib/providers/factory";

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
    const auth = await getEffectiveCredentials(session);
    const provider = getMediaProvider();

    if (useWatchlist && provider.toggleWatchlist) {
      await provider.toggleWatchlist(itemId, action, auth);
    } else if (!useWatchlist && provider.toggleFavorite) {
      await provider.toggleFavorite(itemId, action, auth);
    } else {
      return NextResponse.json({ error: "Operation not supported by this provider" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watchlist/Favorite Toggle Error", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
