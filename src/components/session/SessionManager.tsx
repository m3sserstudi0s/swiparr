"use client";
import { Suspense } from "react";
import { Button } from "../ui/button";
import { Users } from "lucide-react";
import SessionContent from "./SessionContent";

export function SessionManager() {
  return (
    <Suspense fallback={<Button variant="ghost" size="icon" className="ml-4 text-muted-foreground"><Users className="w-6 h-6" /></Button>}>
      <SessionContent />
    </Suspense>
  );
}