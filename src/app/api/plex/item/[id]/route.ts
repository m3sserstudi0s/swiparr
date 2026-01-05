import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { getPlexUrl, getPlexHeaders, apiClient } from "@/lib/plex/api";
import { cookies } from "next/headers";
import { SessionData, PlexMetadata, plexToUnifiedItem } from "@/types/swiparr";
import { db, likes, sessionMembers } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { getEffectiveCredentials, GuestSessionExpiredError } from "@/lib/server/auth-resolver";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    const { accessToken } = await getEffectiveCredentials(session);

    const plexRes = await apiClient.get(getPlexUrl(`/library/metadata/${id}`), {
      headers: getPlexHeaders(accessToken!),
    });

    const plexItem: PlexMetadata = plexRes.data.MediaContainer.Metadata?.[0];
    if (!plexItem) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const item = plexToUnifiedItem(plexItem);

    // Add likes info
    const itemLikes = await db.query.likes.findMany({
        where: and(
            session.sessionCode 
                ? eq(likes.sessionCode, session.sessionCode) 
                : isNull(likes.sessionCode),
            eq(likes.jellyfinItemId, id)
        )
    });

    if (itemLikes.length > 0) {
        // If in session, we can get names from sessionMembers
        let members: any[] = [];
        if (session.sessionCode) {
            members = await db.query.sessionMembers.findMany({
                where: eq(sessionMembers.sessionCode, session.sessionCode)
            });
        }

        item.likedBy = itemLikes.map(l => ({
            userId: l.jellyfinUserId,
            userName: session.sessionCode 
                ? (members.find(m => m.jellyfinUserId === l.jellyfinUserId)?.jellyfinUserName || "Unknown")
                : (l.jellyfinUserId === session.user.Id ? session.user.Name : "Unknown")
        }));
    }

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof GuestSessionExpiredError) {
      session.destroy();
      return NextResponse.json({ error: "Session expired", redirect: "/login" }, { status: 401 });
    }
    console.error("Fetch Details Error", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
