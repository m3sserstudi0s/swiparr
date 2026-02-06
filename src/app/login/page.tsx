"use client";
import { Footer } from "@/components/Footer";
import LightRays from "@/components/ui/LightRays";
import LoginContent from "@/components/login/LoginContent";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="flex h-svh w-full items-center justify-center p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <Suspense fallback={
        <div className="text-foreground">
          <Loader2 className="animate-spin" />
        </div>}>
        <LoginContent />
        <Footer className="pb-6 absolute bottom-5" />
        <div className="absolute w-screen h-screen top-0 left-0 -z-1">
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
    </div>
  );
}