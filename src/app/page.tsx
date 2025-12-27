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
    <main className="flex min-h-screen flex-col items-center">
      <div className="w-full flex items-top justify-between max-w-md px-4 pt-6">
        <SessionManager />
        <Tabs defaultValue="swipe" className="w-full flex flex-col h-full -mx-14">
          <TabsList className="grid mx-auto w-fit h-fit grid-cols-2 bg-muted">

            <TabsTrigger value="swipe" className="h-9 w-13 group">
              <GalleryHorizontalEnd 
                className="text-foreground fill-none transition-all group-data-[state=active]:fill-foreground" 
              />
            </TabsTrigger>

            <TabsTrigger value="likes" className="h-9 w-13 group">
              <Heart 
                className="text-foreground fill-none transition-all group-data-[state=active]:fill-foreground" 
              />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="swipe" className="w-full outline-none">
            <CardDeck />
          </TabsContent>
          <TabsContent value="likes" className=" w-full mt-4 outline-none">
            <LikesList />
          </TabsContent>
        </Tabs>
        <UserMenu/>
      </div>
    </main>
  );
}
