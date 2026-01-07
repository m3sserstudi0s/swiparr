import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getBlurDataURL } from "@/lib/server/image-blur";
import { sessionOptions } from "@/lib/session";
import { SessionData } from "@/types/swiparr";
import { getEffectiveCredentials } from "@/lib/server/auth-resolver";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  if (!session.isLoggedIn) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    const { accessToken, deviceId } = await getEffectiveCredentials(session);
    const searchParams = request.nextUrl.searchParams;
    const imageType = searchParams.get("imageType") || "Primary";
    
    const blurDataURL = await getBlurDataURL(id, accessToken!, deviceId!, imageType);
    
    if (!blurDataURL) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json({ blurDataURL });
  } catch (error) {
    console.error("Blur API Error", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
