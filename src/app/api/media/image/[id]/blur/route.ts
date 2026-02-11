import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getSessionOptions } from "@/lib/session";
import { SessionData } from "@/types";
import { AuthService } from "@/lib/services/auth-service";
import { getMediaProvider } from "@/lib/providers/factory";
import { handleApiError } from "@/lib/api-utils";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id === "undefined") {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, await getSessionOptions());
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  try {
    const searchParams = request.nextUrl.searchParams;
    const imageType = searchParams.get("imageType") || "Primary";
    const creds = await AuthService.getEffectiveCredentials(session);
    const provider = getMediaProvider(creds.provider);
    
    const blurDataURL = await provider.getBlurDataUrl(id, imageType, creds);
    
    if (!blurDataURL) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json({ blurDataURL });
  } catch (error) {
    return handleApiError(error, "Failed to fetch blur data");
  }
}
