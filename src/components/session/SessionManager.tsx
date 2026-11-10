"use client";
import { Suspense } from "react";
import { Button } from "../ui/button";
import { Users } from "lucide-react";
import SessionContent from "./SessionContent";

export function SessionManager() {
  return (
    <Suspense fallback={<Button variant="ghost" size="icon" className="text-muted-foreground size-10 absolute left-6 bg-muted/30"><Users className="size-5" /></Button>}>
      <SessionContent />
    </Suspense>
  );
}