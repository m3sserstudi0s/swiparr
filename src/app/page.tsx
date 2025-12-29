"use client";
import { CardDeck } from "@/components/deck/CardDeck";
import { SessionManager } from "@/components/session/SessionManager";
import { LikesList } from "@/components/likes/LikesList";
import { Button } from "@/components/ui/button";
import { GalleryHorizontalEnd, Heart, LogOut } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserMenu } from "@/components/home/UserMenu";

export default function Home() {

  return (
    <main className="flex min-h-screen flex-col items-center px-6">
      <div className="w-full flex items-top justify-between max-w-sm pt-8 relative">
        <SessionManager />
        <Tabs defaultValue="swipe" className="w-full flex flex-col h-full -mt-2">
          <TabsList className="grid mx-auto w-fit h-fit grid-cols-2 bg-muted">

            <TabsTrigger value="swipe" className="h-11 w-15 group">
              <GalleryHorizontalEnd
                className="size-5 text-foreground fill-none transition-all group-data-[state=active]:fill-foreground"
              />
            </TabsTrigger>

            <TabsTrigger value="likes" className="h-11 w-15 group">
              <Heart
                className="size-5 text-foreground fill-none transition-all group-data-[state=active]:fill-foreground"
              />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="swipe" className="w-full outline-none m-0 p-0">
            <CardDeck />
          </TabsContent>
          <TabsContent value="likes" className=" w-full mt-4 outline-none">
            <LikesList />
          </TabsContent>
        </Tabs>
        <UserMenu />
      </div>
    </main>
  );
}
