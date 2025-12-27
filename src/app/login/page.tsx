"use client";
import LoginContent from "@/components/login/LoginContent";
import { Suspense } from "react";

export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <Suspense fallback={<div className="text-foreground">Loading...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}