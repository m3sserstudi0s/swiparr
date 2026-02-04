"use client";
import { Footer } from "@/components/Footer";
import LoginContent from "@/components/login/LoginContent";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="flex h-svh w-full items-center justify-center p-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <Suspense fallback={<div className="text-foreground">Loading...</div>}>
        <LoginContent />
        <Footer className="pb-6 absolute bottom-5" />
      </Suspense>
    </div>
  );
}