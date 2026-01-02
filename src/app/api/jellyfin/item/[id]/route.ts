import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { getJellyfinUrl, getAuthenticatedHeaders } from "@/lib/jellyfin/api";
import { cookies } from "next/headers";
import axios from "axios";
import { SessionData } from "@/types/swiparr";
import { db, likes, sessionMembers } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    const jellyfinRes = await axios.get(getJellyfinUrl(`/Users/${session.user.Id}/Items/${id}`), {
      headers: getAuthenticatedHeaders(session.user.AccessToken, session.user.DeviceId),
    });

    const item = jellyfinRes.data;

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
    console.error("Fetch Details Error", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
