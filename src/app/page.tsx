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
    <main className="flex min-h-screen flex-col items-center px-6 md:p-0">
      <div className="w-full flex items-top justify-between 3xl:max-w-md max-w-sm mt-8 md:mt-[5vh] 2xl:mt-[8vh] relative">
        <SessionManager />
        <Tabs defaultValue="swipe" className="w-full flex flex-col h-full -mt-2">
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
        <UserMenu />
      </div>
    </main>
  );
}
