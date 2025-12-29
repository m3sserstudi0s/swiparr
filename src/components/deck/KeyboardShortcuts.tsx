"use client";

import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Heart, Info, X } from "lucide-react";

export function KeyboardShortcuts() {
  
  return (

      <div className="hidden md:flex flex-col items-center gap-3 mt-8 text-muted-foreground/60 select-none absolute left-4/5 top-1/2 transform -translate-y-1/2 pr-4">
        <div className="flex flex-col gap-12">
          <div className="flex flex-col items-center gap-2">
            <KbdGroup>
              <Kbd size={'lg'}>A</Kbd>
              <span className="text-sm">or</span>
              <Kbd size={'lg'}>←</Kbd>
            </KbdGroup>
            <X/>
          </div>
          <div className="flex flex-col items-center gap-2">
            <KbdGroup>
              <Kbd size={'lg'}>Space</Kbd>
              <span className="text-sm">or</span>
              <Kbd size={'lg'}>Enter</Kbd>
            </KbdGroup>
            <Info/>
          </div>
          <div className="flex flex-col items-center gap-2">
            <KbdGroup>
              <Kbd size={'lg'}>D</Kbd>
              <span className="text-sm">or</span>
              <Kbd size={'lg'}>→</Kbd>
            </KbdGroup>
            <Heart/>
          </div>
        </div>
      </div>

  );
}
