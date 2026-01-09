import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { getJellyfinUrl, getAuthenticatedHeaders, apiClient } from "@/lib/jellyfin/api";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { db, likes, sessionMembers } from "@/lib/db";
import { eq, and, isNull, or, sql } from "drizzle-orm";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getBlurDataURL } from "@/lib/server/image-blur";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    const { accessToken, deviceId, userId } = await getEffectiveCredentials(session);

    const jellyfinRes = await apiClient.get(getJellyfinUrl(`/Users/${userId}/Items/${id}`), {
      headers: getAuthenticatedHeaders(accessToken!, deviceId!),
    });

    const item = jellyfinRes.data;

    // Add likes info
    // Fetch likes from BOTH the current session and solo mode
    const itemLikes = await db.query.likes.findMany({
        where: and(
            eq(likes.jellyfinItemId, id),
            session.sessionCode 
                ? or(eq(likes.sessionCode, session.sessionCode), isNull(likes.sessionCode))
                : isNull(likes.sessionCode)
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
                : (l.jellyfinUserId === session.user.Id ? session.user.Name : "Unknown"),
            sessionCode: l.sessionCode
        }));
    }

    item.BlurDataURL = await getBlurDataURL(id, accessToken!, deviceId!);

    return NextResponse.json(item);
  } catch (error) {
    console.error("Fetch Details Error", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
