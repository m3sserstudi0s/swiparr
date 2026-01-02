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
    <main className="flex min-h-screen flex-col items-center px-6 md:p-0 overflow-hidden">
      <div className="w-full flex items-top justify-between 3xl:max-w-md max-w-sm mt-8 md:mt-[5vh] 2xl:mt-[8vh] relative">
        <SessionManager />
        <Tabs value={tab} onValueChange={setTab} className="w-full flex flex-col h-full -mt-2">
          <TabsList className="grid mx-auto w-fit h-fit grid-cols-2 bg-muted rounded-4xl">

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

          <TabsContent value="swipe" className="w-full outline-none">
            <CardDeck />
          </TabsContent>
          <TabsContent value="likes" className=" w-full outline-none">
            <LikesList />
          </TabsContent>
        </Tabs>
        <SettingsSidebar />
      </div>
    </main>

  );
}
