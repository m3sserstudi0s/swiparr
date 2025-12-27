"use client";

import React from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Star, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { JellyfinItem } from "@/types/swiparr";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { OptimizedImage } from "@/components/ui/optimized-image";

interface Props {
  movieId: string | null;
  onClose: () => void;
}

export function MovieDetailView({ movieId, onClose }: Props) {
  // 1. Create a manual motion value for scroll position
  const scrollY = useMotionValue(0);

  // 2. Define transforms based on that value (0 to 300px of scroll)
  const imgY = useTransform(scrollY, [0, 300], [0, 100]);
  const imgOpacity = useTransform(scrollY, [0, 200], [0.6, 0.2]);
  const imgScale = useTransform(scrollY, [0, 300], [1, 1.1]);

  // Handle scroll event manually to update the motion value
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    scrollY.set(e.currentTarget.scrollTop);
  };

  const { data: movie, isLoading } = useQuery({
    queryKey: ["movie", movieId],
    queryFn: async () => {
      if (!movieId) return null;
      const res = await axios.get<JellyfinItem>(`/api/jellyfin/item/${movieId}`);
      return res.data;
    },
    enabled: !!movieId,
  });

  const ticksToTime = (ticks?: number) => {
    if (!ticks) return "";
    const minutes = Math.floor(ticks / 600000000);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const jellyfinUrl = process.env.NEXT_PUBLIC_JELLYFIN_PUBLIC_URL;

  return (
    <Sheet open={!!movieId} onOpenChange={(open: boolean) => !open && onClose()}>
      <SheetContent
        side="bottom"
        onScroll={handleScroll} // Update motion value here
        className="p-0 overflow-y-auto h-[90vh] sm:max-w-full z-101 outline-none"
      >
        <SheetTitle className="sr-only">Movie Details</SheetTitle>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : movie ? (
          <div className="relative">
            {/* PARALLAX BACKGROUND */}
            <div className="relative w-full h-72 overflow-hidden bg-background">
              <motion.div
                style={{ 
                  y: imgY, 
                  opacity: imgOpacity, 
                  scale: imgScale 
                }}
                className="absolute inset-0 w-full h-[120%]"
              >
                <OptimizedImage
                  src={`/api/jellyfin/image/${movie.Id}`}
                  className="w-full h-full object-cover"
                  alt="Backdrop"
                />
              </motion.div>

              {/* Overlays */}
              <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />
              
              {/* Header Content */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end gap-4">
                <OptimizedImage
                  src={`/api/jellyfin/image/${movie.Id}`}
                  className="w-24 h-36 rounded-lg shadow-2xl shadow-black border border-foreground/10 object-cover z-10"
                  alt="Poster"
                />
                <div className="flex-1 mb-1 z-10">
                  <h2 className="text-2xl font-bold leading-tight drop-shadow-lg text-foreground mb-1">
                    {movie.Name}
                  </h2>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {movie.ProductionYear && (
                        <Badge variant="secondary" className="bg-foreground/20 text-foreground border-none backdrop-blur-md">
                            {movie.ProductionYear}
                        </Badge>
                    )}
                    {movie.RunTimeTicks && (
                      <span className="flex items-center gap-1 text-foreground/80 drop-shadow-md">
                        <Clock className="w-3 h-3" /> {ticksToTime(movie.RunTimeTicks)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="relative z-20 p-6 bg-background">
              <div className="flex gap-2 mb-8 md:max-w-sm">
                <Link href={`${jellyfinUrl}/web/index.html#/details?id=${movie.Id}&context=home`} target="_blank" className="flex-1">
                  <Button className="w-full" size="lg">
                    <Play className="w-4 h-4 mr-2 fill-current" /> Play
                  </Button>
                </Link>
                {movie.CommunityRating && (
                  <div className="flex flex-col items-center justify-center px-6 bg-muted rounded-md border border-border">
                    <span className="flex items-center text-foreground font-bold text-lg">
                      <Star className="w-4 h-4 mr-1.5 fill-foreground text-foreground" />
                      {movie.CommunityRating.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              {/* SYNOPSIS */}
              <div className="mb-8">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Synopsis</h3>
                <p className="text-foreground text-base leading-relaxed font-light">
                  {movie.Overview || "No overview available."}
                </p>
              </div>

              {/* CAST */}
              {movie.People && movie.People.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                    Cast
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {movie.People.slice(0, 6).map(person => (
                      <div key={person.Id} className="flex flex-col bg-muted/30 p-3 rounded-lg border border-border/50">
                        <div className="font-bold text-sm text-foreground truncate">{person.Name}</div>
                        <div className="text-xs text-muted-foreground truncate">{person.Role}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}