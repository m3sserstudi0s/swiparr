import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/session";
import { db, likes as likesTable, sessionMembers, type Like } from "@/lib/db";
import { eq, and, isNotNull, isNull, desc, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { getJellyfinUrl, getAuthenticatedHeaders, apiClient } from "@/lib/jellyfin/api";
import { SessionData, type JellyfinItem, type MergedLike } from "@/types/swiparr";
import { events, EVENT_TYPES } from "@/lib/events";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get("sortBy") || "date";
  const filter = searchParams.get("filter") || "all";

  try {
    const { accessToken, deviceId } = await getEffectiveCredentials(session);

    const conditions = [eq(likesTable.jellyfinUserId, session.user.Id)];

    if (filter === "session") {
        conditions.push(isNotNull(likesTable.sessionCode));
    } else if (filter === "solo") {
        conditions.push(isNull(likesTable.sessionCode));
    }

    const likesResult = await db.select().from(likesTable)
        .where(and(...conditions))
        .orderBy(desc(likesTable.createdAt));

    if (likesResult.length === 0) return NextResponse.json([]);

    const ids = likesResult.map((l: Like) => l.jellyfinItemId).join(",");
    const jellyfinRes = await apiClient.get(getJellyfinUrl(`/Items`), {
        params: {
            Ids: ids,
            Fields: "ProductionYear,CommunityRating",
        },
        headers: getAuthenticatedHeaders(accessToken!, deviceId!),
    });

    const items: JellyfinItem[] = jellyfinRes.data.Items;

    // Fetch all likes in this session for these items to identify contributors
    // Only if we have session items
    const sessionCodes = [...new Set(likesResult.map(l => l.sessionCode).filter(Boolean))];
    let allRelatedLikes: any[] = [];
    let members: any[] = [];

    if (sessionCodes.length > 0) {
        allRelatedLikes = await db.query.likes.findMany({
            where: and(
                inArray(likesTable.sessionCode, sessionCodes as string[]),
                inArray(likesTable.jellyfinItemId, items.map(i => i.Id))
            )
        });
        members = await db.query.sessionMembers.findMany({
            where: inArray(sessionMembers.sessionCode, sessionCodes as string[])
        });
    }

    let merged: MergedLike[] = items.map((item: JellyfinItem) => {
        const likeData = likesResult.find((l: Like) => l.jellyfinItemId === item.Id);
        const itemLikes = allRelatedLikes.filter(l => l.jellyfinItemId === item.Id && l.sessionCode === likeData?.sessionCode);
        
        return {
            ...item,
            swipedAt: likeData?.createdAt,
            sessionCode: likeData?.sessionCode,
            isMatch: likeData?.isMatch ?? false,
            likedBy: itemLikes.map(l => ({
                userId: l.jellyfinUserId,
                userName: members.find(m => m.jellyfinUserId === l.jellyfinUserId && m.sessionCode === l.sessionCode)?.jellyfinUserName || "Unknown"
            }))
        };
    });

    if (sortBy === "year") {
        merged.sort((a, b) => (b.ProductionYear || 0) - (a.ProductionYear || 0));
    } else if (sortBy === "rating") {
        merged.sort((a, b) => (b.CommunityRating || 0) - (a.CommunityRating || 0));
    } else if (sortBy === "likes") {
        merged.sort((a, b) => (b.likedBy?.length || 0) - (a.likedBy?.length || 0));
    } else {
        merged.sort((a, b) => {
            const dateA = a.swipedAt ? new Date(a.swipedAt).getTime() : 0;
            const dateB = b.swipedAt ? new Date(b.swipedAt).getTime() : 0;
            return dateB - dateA;
        });
    }

    return NextResponse.json(merged);
  } catch (error) {
    console.error("Fetch User Likes Error", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");
  const sessionCodeQuery = searchParams.get("sessionCode");
  
  if (!itemId) return new NextResponse("Missing itemId", { status: 400 });

  const targetSessionCode = sessionCodeQuery !== null 
    ? (sessionCodeQuery === "" ? null : sessionCodeQuery)
    : (session.sessionCode || null);

  try {
    // Delete the user's like for this item
    await db.delete(likesTable).where(
        and(
            eq(likesTable.jellyfinUserId, session.user.Id),
            eq(likesTable.jellyfinItemId, itemId),
            targetSessionCode ? eq(likesTable.sessionCode, targetSessionCode) : isNull(likesTable.sessionCode)
        )
    );

    // If it was a session match, we might need to update other users' like.isMatch status
    if (targetSessionCode) {
        const remainingLikes = await db.query.likes.findMany({
            where: and(
                eq(likesTable.sessionCode, targetSessionCode),
                eq(likesTable.jellyfinItemId, itemId)
            )
        });

        if (remainingLikes.length < 2) {
            // No longer a match for anyone
            await db.update(likesTable)
                .set({ isMatch: false })
                .where(
                    and(
                        eq(likesTable.sessionCode, targetSessionCode),
                        eq(likesTable.jellyfinItemId, itemId)
                    )
                );
        }

        // Notify that matches might have changed
        events.emit(EVENT_TYPES.MATCH_REMOVED, {
            sessionCode: targetSessionCode,
            itemId: itemId,
            userId: session.user.Id
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete Like Error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
