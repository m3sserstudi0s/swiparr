import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { cookies } from "next/headers";
import { SessionData } from "@/types";
import { db, likes, sessionMembers } from "@/lib/db";
import { eq, and, isNull, or } from "drizzle-orm";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getMediaProvider } from "@/lib/providers/factory";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    const auth = await getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);

    const item = await provider.getItemDetails(id, auth);

    // Add likes info
    const itemLikes = await db.query.likes.findMany({
        where: and(
            eq(likes.externalId, id),
            session.sessionCode 
                ? or(eq(likes.sessionCode, session.sessionCode), isNull(likes.sessionCode))
                : isNull(likes.sessionCode)
        )
    });

    if (itemLikes.length > 0) {
        let members: any[] = [];
        if (session.sessionCode) {
            members = await db.query.sessionMembers.findMany({
                where: eq(sessionMembers.sessionCode, session.sessionCode)
            });
        }

        item.likedBy = itemLikes.map(l => ({
            userId: l.externalUserId,
            userName: session.sessionCode 
                ? (members.find(m => m.externalUserId === l.externalUserId)?.externalUserName || "Unknown")
                : (l.externalUserId === session.user.Id ? session.user.Name : "Unknown"),
            sessionCode: l.sessionCode
        }));
    }

    item.BlurDataURL = await provider.getBlurDataUrl(id, "Primary", auth);

    return NextResponse.json(item);
  } catch (error) {
    console.error("Fetch Details Error", error);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
