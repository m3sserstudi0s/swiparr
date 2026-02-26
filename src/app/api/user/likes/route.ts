import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { getSessionOptions } from "@/lib/session";
import { db, likes as likesTable, sessionMembers, userProfiles, type Like } from "@/lib/db";
import { eq, and, isNotNull, isNull, desc, inArray, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { SessionData, type MediaItem, type MergedLike } from "@/types";
import { EventService } from "@/lib/services/event-service";
import { EVENT_TYPES } from "@/lib/events";
import { AuthService } from "@/lib/services/auth-service";
import { getMediaProvider } from "@/lib/providers/factory";
import { handleApiError } from "@/lib/api-utils";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get("sortBy") || "date";
  const filter = searchParams.get("filter") || "all";

  try {
    const auth = await AuthService.getEffectiveCredentials(session);
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

    const ids = [...new Set(likesResult.map((l: Like) => l.externalId))] as string[];
    
    const itemsMap = new Map<string, MediaItem>();
    await Promise.all(ids.map(async (id: string) => {
        try {
            const item = await provider.getItemDetails(id, auth, { includeUserState: true });
            if (item) itemsMap.set(id, item);
        } catch (error) {
            logger.error(`Failed to fetch details for ${id}`, error);
        }
    }));

    const sessionCodes = [...new Set(likesResult.map((l: any) => l.sessionCode).filter(Boolean))];
    let allRelatedLikes: any[] = [];
    let members: any[] = [];

    if (sessionCodes.length > 0) {
        allRelatedLikes = await db.select().from(likesTable).where(and(
            inArray(likesTable.sessionCode, sessionCodes as string[]),
            inArray(likesTable.externalId, Array.from(itemsMap.keys()))
        ));
        members = await db.select({
            externalUserId: sessionMembers.externalUserId,
            externalUserName: sessionMembers.externalUserName,
            sessionCode: sessionMembers.sessionCode,
            hasCustomProfilePicture: sql<boolean>`CASE WHEN ${userProfiles.userId} IS NOT NULL THEN 1 ELSE 0 END`,
            profileUpdatedAt: userProfiles.updatedAt,
        })
        .from(sessionMembers)
        .leftJoin(userProfiles, eq(sessionMembers.externalUserId, userProfiles.userId))
        .where(
            inArray(sessionMembers.sessionCode, sessionCodes as string[])
        );
    }

    let merged: MergedLike[] = likesResult.map((likeData: Like) => {
        const item = itemsMap.get(likeData.externalId);
        if (!item) return null;

        const itemLikes = allRelatedLikes.filter((l: any) => l.externalId === item.Id && l.sessionCode === likeData.sessionCode);
        
        return {
            ...item,
            swipedAt: likeData.createdAt,
            sessionCode: likeData.sessionCode,
            isMatch: likeData.isMatch ?? false,
            likedBy: likeData.sessionCode ? itemLikes.map((l: any) => {
                const member = members.find((m: any) => m.externalUserId === l.externalUserId && m.sessionCode === l.sessionCode);
                return {
                    userId: l.externalUserId,
                    userName: member?.externalUserName || "Unknown",
                    hasCustomProfilePicture: !!member?.hasCustomProfilePicture,
                    profileUpdatedAt: member?.profileUpdatedAt,
                };
            }) : [{
                userId: session.user.Id,
                userName: session.user.Name
            }]
        };
    }).filter((l: MergedLike | null): l is MergedLike => l !== null);

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
    return handleApiError(error, "Failed to fetch likes");
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
    await db.delete(likesTable).where(
        and(
            eq(likesTable.externalUserId, session.user.Id),
            eq(likesTable.externalId, itemId),
            targetSessionCode ? eq(likesTable.sessionCode, targetSessionCode) : isNull(likesTable.sessionCode)
        )
    );

    if (targetSessionCode) {
        const remainingLikes = await db.select().from(likesTable).where(and(
            eq(likesTable.sessionCode, targetSessionCode),
            eq(likesTable.externalId, itemId)
        ));

        if (remainingLikes.length < 2) {
            await db.update(likesTable)
                .set({ isMatch: false })
                .where(
                    and(
                        eq(likesTable.sessionCode, targetSessionCode),
                        eq(likesTable.externalId, itemId)
                    )
                );
        }

        await EventService.emit(EVENT_TYPES.MATCH_REMOVED, {
            sessionCode: targetSessionCode,
            itemId: itemId,
            userId: session.user.Id
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "Failed to delete like");
  }
}
