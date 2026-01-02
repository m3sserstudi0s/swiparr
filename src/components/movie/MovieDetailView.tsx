"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Star, Users, HeartOff, Plus, Minus, Info } from "lucide-react";
import { UserAvatarList } from "../session/UserAvatarList";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { JellyfinItem } from "@/types/swiparr";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { toast } from "sonner";
import { Drawer, DrawerContent, DrawerTitle } from "../ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useSettings } from "@/lib/settings";
import { useRuntimeConfig } from "@/lib/runtime-config";

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

  const { data: movie, isLoading: isMovieLoading } = useQuery({
    queryKey: ["movie", movieId],
    queryFn: async () => {
      if (!movieId) return null;
      const res = await axios.get<JellyfinItem>(`/api/jellyfin/item/${movieId}`);
      return res.data;
    },
    enabled: !!movieId,
  });

  const { data: sessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const res = await axios.get<{ code: string | null; userId: string }>("/api/session");
      return res.data;
    },
  });

  const isLoading = isMovieLoading || isSessionLoading;

  const queryClient = useQueryClient();
  const { settings } = useSettings();

  const { mutateAsync: unlike, isPending: isUnliking } = useMutation({

    mutationFn: async () => {
      await axios.delete(`/api/user/likes?itemId=${movieId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["likes"] });
      onClose();
    },
  });

  const useWatchlist = settings.useWatchlist;
  const isInList = (useWatchlist ? movie?.UserData?.Likes : movie?.UserData?.IsFavorite) ?? false;


  const { mutateAsync: toggleWatchlist, isPending: isTogglingWatchlist } = useMutation({
    mutationFn: async () => {
      await axios.post("/api/user/watchlist", {
        itemId: movie?.Id,
        action: isInList ? "remove" : "add",
        useWatchlist
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["movie", movieId] });
    },
  });

  const handleToggleWatchlist = () => {
    const promise = toggleWatchlist();
    toast.promise(promise, {
      loading: "Updating...",
      success: () => {
        return isInList
          ? `Removed from ${useWatchlist ? "watchlist" : "favorites"}`
          : `Added to ${useWatchlist ? "watchlist" : "favorites"}`;
      },
      error: `Failed to update ${useWatchlist ? "watchlist" : "favorites"}`,
    });
  };

  const handleUnlike = () => {
    const promise = unlike();
    toast.promise(promise, {
      loading: "Removing from likes...",
      success: "Removed from likes",
      error: "Failed to remove from likes",
    });
  };

  const ticksToTime = (ticks?: number) => {
    if (!ticks) return "";
    const minutes = Math.floor(ticks / 600000000);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const { jellyfinPublicUrl } = useRuntimeConfig();

  return (
    <Drawer open={!!movieId} onOpenChange={(open: boolean) => !open && onClose()}>
      <DrawerContent>
        <DrawerTitle className="sr-only">Movie Details</DrawerTitle>
        <div className="h-20 w-full bg-linear-to-t to-background absolute top-10 z-1" />
        <div
          onScroll={handleScroll} // Update motion value here
          className="p-0 overflow-y-auto h-[90vh] sm:max-w-full outline-none mt-4">

          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : movie ? (
            <div className="relative">
              {/* PARALLAX BACKGROUND */}
              <div className="relative w-full h-80 overflow-hidden bg-background">
                <motion.div
                  style={{
                    y: imgY,
                    opacity: imgOpacity,
                    scale: imgScale
                  }}
                  className="absolute inset-0 w-full h-[120%]"
                >

                  <OptimizedImage
                    src={movie.BackdropImageTags && movie.BackdropImageTags.length > 0 
                      ? `/api/jellyfin/image/${movie.Id}?imageType=Backdrop&tag=${movie.BackdropImageTags[0]}`
                      : `/api/jellyfin/image/${movie.Id}`
                    }
                    className="w-full h-full object-cover"
                    alt="Backdrop"
                  />
                </motion.div>

                {/* Overlays */}
                <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />

                {/* Header Content */}
                <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
                  <OptimizedImage
                    src={`/api/jellyfin/image/${movie.Id}?tag=${movie.ImageTags?.Primary}`}
                    className="w-28 h-40 rounded-lg shadow-2xl shadow-black border border-foreground/10 object-cover z-10 shrink-0"
                    alt="Poster"
                  />
                  <div className="flex-1 mb-1 z-10 overflow-hidden">
                    {movie.Genres && movie.Genres.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {movie.Genres.slice(0, 3).map(genre => (
                          <span key={genre} className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/20 backdrop-blur-md">
                            {genre}
                          </span>
                        ))}
                      </div>
                    )}
                    <h2 className="text-3xl font-bold leading-tight drop-shadow-lg text-foreground mb-1 truncate">
                      {movie.Name}
                    </h2>
                    {movie.OriginalTitle && movie.OriginalTitle !== movie.Name && (
                      <div className="text-sm text-foreground/60 mb-2 truncate italic">
                        {movie.OriginalTitle}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs items-center">
                      {movie.ProductionYear && (
                        <span className="font-semibold text-foreground/90">
                          {movie.ProductionYear}
                        </span>
                      )}
                      {movie.OfficialRating && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 border-foreground/30 text-foreground/80">
                          {movie.OfficialRating}
                        </Badge>
                      )}
                      {movie.CommunityRating && (
                        <span className="flex items-center gap-1 font-bold">
                          <Star className="w-3 h-3 fill-current" />
                          {movie.CommunityRating.toFixed(1)}
                        </span>
                      )}
                      {movie.RunTimeTicks && (
                        <span className="flex items-center gap-1 text-foreground/70">
                          <Clock className="w-3 h-3" /> {ticksToTime(movie.RunTimeTicks)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* MAIN CONTENT */}
              <div className="relative z-20 p-6 bg-background">
                {movie.Taglines && movie.Taglines.length > 0 && (
                  <div className="mb-6 italic text-lg text-muted-foreground font-light border-l-2 border-primary/30 pl-4">
                    {movie.Taglines[0]}
                  </div>
                )}

                <div className="flex gap-2 mb-8 flex-wrap">
                  <Link href={`${jellyfinPublicUrl}/web/index.html#/details?id=${movie.Id}&context=home`} target="_blank" className="w-32">

                    <Button className="w-32" size="lg">
                      <Play className="w-4 h-4 mr-2 fill-current" /> Play
                    </Button>
                  </Link>
                  <Button
                    className="w-32"
                    size="lg"
                    variant={isInList ? "outline" : "secondary"}
                    onClick={() => handleToggleWatchlist()}
                    disabled={isTogglingWatchlist}
                  >
                    {isInList ? (
                      <Minus className="w-4 h-4 mr-2" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    {useWatchlist ? "Watchlist" : "Favorite"}
                  </Button>
                  {movie.likedBy?.some(l => l.userId === sessionData?.userId) && <Button
                    variant="outline"
                    size="lg"
                    className="shrink-0 aspect-square p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      if (window.confirm("Are you sure you want to unlike this movie?")) {
                        handleUnlike();
                      }
                    }}
                    disabled={isUnliking}
                  >
                    <HeartOff className="w-5 h-5" />
                  </Button>}
                </div>

                {/* LIKED BY */}
                {movie.likedBy && movie.likedBy.length > 0 && sessionData?.code && (
                  <div className="mb-8 bg-muted/20 p-4 rounded-xl border border-border/50">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3" >Liked By</h3>
                    <UserAvatarList users={movie.likedBy} size="lg" />
                  </div>
                )}

                {/* DETAILS ROW */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Director</h3>
                    <div className="text-foreground font-medium">
                      {movie.People?.find(p => p.Type === "Director")?.Name || "Unknown"}
                    </div>
                  </div>
                  {movie.Studios && movie.Studios.length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Studio</h3>
                      <div className="text-foreground font-medium truncate">
                        {movie.Studios[0].Name}
                      </div>
                    </div>
                  )}
                </div>

                {/* SYNOPSIS */}
                <div className="mb-8">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Synopsis</h3>
                  <p className="text-foreground/90 text-base leading-relaxed">
                    {movie.Overview || "No overview available."}
                  </p>
                </div>


                {/* CAST */}
                {movie.People && movie.People.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                      Cast
                    </h3>
                    <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar -mx-6 px-6">
                      {movie.People.filter(p => p.Type === "Actor").slice(0, 12).map(person => (
                        <div key={person.Id} className="flex flex-col items-center gap-2 min-w-20 text-center">
                          <Avatar className="w-16 h-16 border border-border shadow-sm">
                            <AvatarImage 
                              src={`/api/jellyfin/image/${person.Id}?tag=${person.PrimaryImageTag}`} 
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {person.Name.split(" ").map((n: string) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-0.5">
                            <div className="text-[11px] font-bold text-foreground leading-tight line-clamp-2 w-20">{person.Name}</div>
                            <div className="text-[10px] text-muted-foreground leading-tight line-clamp-1 w-20">{person.Role}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
