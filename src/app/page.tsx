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
    <main className="overflow-hidden h-svh">
      <div className="grid justify-center my-[3svh] relative">
        <div className="w-full mt-2 md:max-w-md min-w-0 relative">
          <SessionManager />
          <SettingsSidebar />
        </div>

        <Tabs
          value={tab}
          onValueChange={setTab}
          className="gap-0 w-full sm:max-w-md min-w-0 -mt-0.75"
        >
          <TabsList className="grid mx-auto h-fit grid-cols-2 bg-muted rounded-full z-0">
            <TabsTrigger value="swipe" className="h-11 w-16 group rounded-full z-0">
              <GalleryHorizontalEnd
                className="size-5 z-0 text-foreground fill-none transition-all group-data-[state=active]:fill-foreground"
              />
            </TabsTrigger>

            <TabsTrigger value="likes" className="h-11 w-16 group rounded-full z-0">
              <Heart
                className="size-5 z-0 text-foreground fill-none transition-all group-data-[state=active]:fill-foreground"
              />
            </TabsTrigger>
          </TabsList>

          <TabsContents className="grid max-h-screen">
            <TabsContent value="swipe" className={cn("h-full px-6 outline-none mt-1 w-full sm:max-w-md min-w-0 transition-opacity duration ease-in-out opacity-100", tab != "swipe" && "opacity-0")}>
              <CardDeck />
            </TabsContent>
            <TabsContent value="likes" className={cn("h-full px-6 outline-none mt-4 w-full sm:max-w-md min-w-0 transition-opacity duration ease-in-out opacity-100", tab != "likes" && "opacity-0")}>
               <LikesList />
            </TabsContent>
          </TabsContents>
        </Tabs>
      </div>
    </main>
  );
}