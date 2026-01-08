"use client";
import { CardDeck } from "@/components/deck/CardDeck";
import { SessionManager } from "@/components/session/SessionManager";
import { LikesList } from "@/components/likes/LikesList";
import { GalleryHorizontalEnd, Heart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/animate-ui/components/animate/tabs";
import { SettingsSidebar } from "@/components/home/SettingsSidebar";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { TabsContents } from "@/components/animate-ui/primitives/animate/tabs";
import { cn } from "@/lib/utils";

export default function Home() {
  const [tab, setTab] = useState("swipe");

  useHotkeys("1", () => setTab("swipe"), []);
  useHotkeys("2", () => setTab("likes"), []);

  return (
    <main className="h-svh overflow-y-hidden max-w-screen overflow-hidden">
      <div className="grid justify-center mt-6 md:mt-10 xl:mt-20 relative">
        <div className="w-sm mx-auto relative">
          <SessionManager />
          <SettingsSidebar />
        </div>

        <Tabs
          value={tab}
          onValueChange={setTab}
          className="gap-0 -mt-2 w-sm"
        >
          <TabsList className="grid mx-auto h-fit grid-cols-2 bg-muted rounded-full z-0">
            <TabsTrigger value="swipe" className="h-11 w-15 group rounded-full z-0">
              <GalleryHorizontalEnd
                className="size-5 z-0 text-foreground fill-none transition-all group-data-[state=active]:fill-foreground"
              />
            </TabsTrigger>

            <TabsTrigger value="likes" className="h-11 w-15 group rounded-full z-0">
              <Heart
                className="size-5 z-0 text-foreground fill-none transition-all group-data-[state=active]:fill-foreground"
              />
            </TabsTrigger>
          </TabsList>

          <TabsContents className="grid">
            <TabsContent value="swipe" className={cn("h-full outline-none mt-2 w-sm transition-opacity duration ease-in-out", tab != "swipe" && "opacity-0")}>
              <CardDeck />
            </TabsContent>
            <TabsContent value="likes" className={cn("h-full outline-none mt-4 w-sm transition-opacity duration ease-in-out", tab != "likes" && "opacity-0")}>
               <LikesList />
            </TabsContent>
          </TabsContents>
        </Tabs>
      </div>
    </main>
  );
}