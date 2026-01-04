"use client";
import { CardDeck } from "@/components/deck/CardDeck";
import { SessionManager } from "@/components/session/SessionManager";
import { LikesList } from "@/components/likes/LikesList";
import { GalleryHorizontalEnd, Heart } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SettingsSidebar } from "@/components/home/SettingsSidebar";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

export default function Home() {
  const [tab, setTab] = useState("swipe");

  useHotkeys("1", () => setTab("swipe"), []);
  useHotkeys("2", () => setTab("likes"), []);

  return (
    <main className="flex h-svh w-full flex-col items-center px-6 md:p-0 overflow-hidden bg-background">
      
      <div className="w-full flex flex-col items-center 3xl:max-w-md max-w-sm mt-6 md:mt-[4vh] 2xl:mt-[6vh] relative h-full">
        <SessionManager />
        
        <Tabs 
          value={tab} 
          onValueChange={setTab} 
          className="w-full flex flex-col h-full overflow-hidden gap-0 -mt-2"
        >
          <TabsList className="grid mx-auto w-fit h-fit grid-cols-2 bg-muted rounded-4xl shrink-0">
            <TabsTrigger value="swipe" className="h-11 w-15 group rounded-4xl">
              <GalleryHorizontalEnd
                className="size-5 text-foreground fill-none transition-all group-data-[state=active]:fill-foreground"
              />
            </TabsTrigger>

            <TabsTrigger value="likes" className="h-11 w-15 group rounded-4xl">
              <Heart
                className="size-5 text-foreground fill-none transition-all group-data-[state=active]:fill-foreground"
              />
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 w-full mt-2 overflow-hidden">
            <TabsContent value="swipe" className="h-full w-full outline-none mt-0">
              <CardDeck />
            </TabsContent>
            <TabsContent value="likes" className="h-full w-full outline-none mt-0">
              <LikesList />
            </TabsContent>
          </div>
        </Tabs>
        
        <SettingsSidebar />
      </div>
    </main>
  );
}