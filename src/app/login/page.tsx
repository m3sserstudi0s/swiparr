import { Footer } from "@/components/Footer";
import LightRays from "@/components/ui/LightRays";
import LoginContent from "@/components/login/LoginContent";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getAsyncRuntimeConfig } from "@/lib/server/runtime-config";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const join = params.join;
  const { basePath, appPublicUrl } = await getAsyncRuntimeConfig();
  const origin = appPublicUrl.startsWith('http') ? appPublicUrl : `https://${appPublicUrl}`;
  
  if (join && typeof join === 'string') {
    const ogUrl = new URL(`${basePath}/api/og`, origin);
    ogUrl.searchParams.set('join', join);
    const title = "Swiparr – Join session";
    const description = `You've been invited to join a session with code: ${join}.`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images: [
          {
            url: ogUrl.toString(),
            width: 1200,
            height: 630,
          }
        ]
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogUrl.toString()],
      }
    };
  }

  return {
    title: "Login",
    description: "Login to Swiparr to start swiping on what to watch next, by yourself or together.",
  };
}

export default function LoginPage() {
  return (
    <main className="flex items-center justify-center overflow-hidden h-svh pt-[env(safe-area-inset-top)] font-sans">
      <Suspense fallback={
        <div className="text-foreground">
          <Loader2 className="animate-spin" />
        </div>}>
        <LoginContent />
        <Footer className="pb-6 absolute bottom-5" />
        <div className="absolute w-full h-full top-0 left-0 -z-1">
          <LightRays
            followMouse={false}
            raysSpeed={0.5}
            lightSpread={0.9}
            fadeDistance={100}
            className="block md:hidden"
          />
          <LightRays
            followMouse={false}
            raysSpeed={0.5}
            lightSpread={0.9}
            fadeDistance={0.4}
            className="md:block hidden"
          />
        </div>
      </Suspense>
    </main>
  );
}
