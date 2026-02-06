import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { db, likes as likesTable, sessionMembers, type Like } from "@/lib/db";
import { eq, and, isNotNull, isNull, desc, inArray } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData, type MediaItem, type MergedLike } from "@/types";
import { events, EVENT_TYPES } from "@/lib/events";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";
import { getMediaProvider } from "@/lib/providers/factory";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get("sortBy") || "date";
  const filter = searchParams.get("filter") || "all";

  try {
    const auth = await getEffectiveCredentials(session);
    const provider = getMediaProvider(auth.provider);

    const conditions = [eq(likesTable.externalUserId, session.user.Id)];

    if (filter === "session") {
        conditions.push(isNotNull(likesTable.sessionCode));
    } else if (filter === "solo") {
        conditions.push(isNull(likesTable.sessionCode));
    }

    const likesResult = await db.select().from(likesTable)
        .where(and(...conditions))
        .orderBy(desc(likesTable.createdAt));

    if (likesResult.length === 0) return NextResponse.json([]);

    const ids = likesResult.map((l: Like) => l.externalId);
    
    // We should ideally use the provider here to get full details for multiple IDs
    // JellyfinProvider currently doesn't have getMultipleDetails, but we can call getItems with IDs if it supports it.
    
    // Let's add getItemsByIds to MediaProvider or just use getItemDetails in a loop (not ideal but safe for now)
    const itemsPromises = ids.map(async (id: any) => {
        try {
            return await provider.getItemDetails(id, auth);
        } catch (error) {
            // TODO: Improve error handling here (for 404 when item does not exist in library anymore)
            // console.warn(`Failed to fetch details for item ${id}:`, error instanceof Error ? error.message : error);
            return null;
        }
    });

    const itemsResults = await Promise.all(itemsPromises);
    const items = itemsResults.filter((item): item is MediaItem => item !== null);


    // Fetch all likes in this session for these items to identify contributors
    // Only if we have session items
    const sessionCodes = [...new Set(likesResult.map((l: any) => l.sessionCode).filter(Boolean))];
    let allRelatedLikes: any[] = [];
    let members: any[] = [];

    if (sessionCodes.length > 0) {
        allRelatedLikes = await db.query.likes.findMany({
            where: and(
                inArray(likesTable.sessionCode, sessionCodes as string[]),
                inArray(likesTable.externalId, items.map((i: any) => i.Id))
            )
        });
        members = await db.query.sessionMembers.findMany({
            where: inArray(sessionMembers.sessionCode, sessionCodes as string[])
        });
    }

    let merged: MergedLike[] = items.map((item: MediaItem) => {
        const likeData = likesResult.find((l: Like) => l.externalId === item.Id);
        const itemLikes = allRelatedLikes.filter((l: any) => l.externalId === item.Id && l.sessionCode === likeData?.sessionCode);
        
        return {
            ...item,
            swipedAt: likeData?.createdAt,
            sessionCode: likeData?.sessionCode,
            isMatch: likeData?.isMatch ?? false,
            likedBy: itemLikes.map((l: any) => ({
                userId: l.externalUserId,
                userName: members.find((m: any) => m.externalUserId === l.externalUserId && m.sessionCode === l.sessionCode)?.externalUserName || "Unknown"
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
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
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
            eq(likesTable.externalUserId, session.user.Id),
            eq(likesTable.externalId, itemId),
            targetSessionCode ? eq(likesTable.sessionCode, targetSessionCode) : isNull(likesTable.sessionCode)
        )
    );

    // If it was a session match, we might need to update other users' like.isMatch status
    if (targetSessionCode) {
        const remainingLikes = await db.query.likes.findMany({
            where: and(
                eq(likesTable.sessionCode, targetSessionCode),
                eq(likesTable.externalId, itemId)
            )
        });

        if (remainingLikes.length < 2) {
            // No longer a match for anyone
            await db.update(likesTable)
                .set({ isMatch: false })
                .where(
                    and(
                        eq(likesTable.sessionCode, targetSessionCode),
                        eq(likesTable.externalId, itemId)
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
