import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { saveProfilePicture, deleteProfilePicture } from "@/lib/server/profile-picture";
import { handleApiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn || !session.user?.Id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ message: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        await saveProfilePicture(session.user.Id, buffer, file.type);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return handleApiError(error, "Upload failed");
    }
}

export async function DELETE(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());

    if (!session.isLoggedIn || !session.user?.Id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        await deleteProfilePicture(session.user.Id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return handleApiError(error, "Delete failed");
    }
}
