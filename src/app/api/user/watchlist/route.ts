import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { AuthService } from "@/lib/services/auth-service";
import { getMediaProvider } from "@/lib/providers/factory";
import { handleApiError } from "@/lib/api-utils";
import { ProviderType } from "@/lib/providers/types";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  if (session.user.isGuest) {
    return NextResponse.json({ error: "Guests cannot modify watchlist/favorites" }, { status: 403 });
  }

    const { itemId, action, useWatchlist } = await request.json();

  if (!itemId) return new NextResponse("Missing itemId", { status: 400 });

  try {
    const auth = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);

    const effectiveUseWatchlist = auth.provider === ProviderType.PLEX ? true : useWatchlist;

    if (effectiveUseWatchlist && provider.toggleWatchlist) {
      await provider.toggleWatchlist(itemId, action, auth);
    } else if (!effectiveUseWatchlist && provider.toggleFavorite) {
      await provider.toggleFavorite(itemId, action, auth);
    } else {
      return NextResponse.json({ error: "Operation not supported by this provider" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to update watchlist/favorites");
  }
}
