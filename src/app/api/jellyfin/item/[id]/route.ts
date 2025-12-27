import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { getJellyfinUrl } from "@/lib/jellyfin/api";
import { cookies } from "next/headers";
import axios from "axios";
import { SessionData } from "@/types/swiparr";
import { db, likes, sessionMembers } from "@/lib/db";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    const jellyfinRes = await axios.get(getJellyfinUrl(`/Users/${session.user.Id}/Items/${id}`), {
      headers: { "X-Emby-Token": session.user.AccessToken },
    });

    const item = jellyfinRes.data;

    // Add session matches info if in session
    if (session.sessionCode) {
        const itemLikes = await db.query.likes.findMany({
            where: and(
                eq(likes.sessionCode, session.sessionCode),
                eq(likes.jellyfinItemId, id)
            )
        });

        if (itemLikes.length > 0) {
            const members = await db.query.sessionMembers.findMany({
                where: eq(sessionMembers.sessionCode, session.sessionCode)
            });

            item.likedBy = itemLikes.map(l => ({
                userId: l.jellyfinUserId,
                userName: members.find(m => m.jellyfinUserId === l.jellyfinUserId)?.jellyfinUserName || "Unknown"
            }));
        }
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Fetch Details Error", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
