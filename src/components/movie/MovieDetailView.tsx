"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, Star, HeartOff, Bookmark, ShieldCheck, ExternalLink } from "lucide-react";
import { UserAvatarList } from "../session/UserAvatarList";
import { useQuery } from "@tanstack/react-query";
import { MediaItem, WatchProvider } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Drawer, DrawerContent, DrawerTitle } from "../ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { useSession } from "@/hooks/api";
import { ticksToTime, cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useMovieActions } from "@/hooks/use-movie-actions";
import { QUERY_KEYS } from "@/hooks/api/query-keys";
import { TMDB_MOVIE_BASE_URL } from "@/lib/constants";

interface Props {
  movieId: string | null;
  onClose: () => void;
  showLikedBy?: boolean;
  sessionCode?: string | null;
}

export function MovieDetailView({ movieId, onClose, showLikedBy = true, sessionCode }: Props) {
  // 1. Create a manual motion value for scroll position
  const scrollY = useMotionValue(0);

  // 2. Define transforms based on that value (0 to 300px of scroll)
  const imgY = useTransform(scrollY, [0, 300], [0, 300]);
  const imgOpacity = useTransform(scrollY, [0, 300], [0.75, 0.2]);
  const imgScale = useTransform(scrollY, [0, 300], [1, 1.15]);

  // Handle scroll event manually to update the motion value
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    scrollY.set(e.currentTarget.scrollTop);
  };

  const { data: movie, isLoading } = useQuery({
    queryKey: QUERY_KEYS.movie(movieId, sessionCode),
    queryFn: async () => {
      if (!movieId) return null;
      const codeParam = sessionCode === null ? "" : (sessionCode ?? "");
      const res = await apiClient.get<MediaItem>(`/api/media/item/${movieId}?sessionCode=${codeParam}`);
      return res.data;
    },
    enabled: !!movieId,
  });

  const {
    isInList,
    isLikedByMe,
    isTogglingWatchlist,
    isUnliking,
    handleToggleWatchlist,
    handleUnlike,
    useWatchlist,
    isGuest
  } = useMovieActions(movie || null, {
    onUnlikeSuccess: onClose,
    sessionCode
  });

  const { serverPublicUrl: runtimeServerUrl, capabilities: runtimeCapabilities } = useRuntimeConfig();
  const { data: sessionStatus } = useSession({ enabled: !!movieId });
  const capabilities = sessionStatus?.capabilities || runtimeCapabilities;
  const serverPublicUrl = sessionStatus?.serverUrl || runtimeServerUrl;

  return (
    <Drawer open={!!movieId} onOpenChange={(open: boolean) => !open && onClose()}>
      <DrawerContent>
        <DrawerTitle className="sr-only">Movie Details</DrawerTitle>
        <div
          onScroll={handleScroll} // Update motion value here
          className={cn(
            "p-0 overflow-y-auto h-[90vh] sm:max-w-full outline-none mt-1 no-scrollbar relative",
            "mask-[linear-gradient(to_bottom,transparent_0%,black_30px,black_calc(100%-80px),transparent_100%)]"
          )}>

          {isLoading ? (
            <div className="h-64 w-full relative">
              <div className="absolute -bottom-12 left-4 flex items-end gap-3">
                <Skeleton className="w-28 h-40 rounded-lg shadow-2xl shadow-background border border-foreground/10 object-cover z-10 shrink-0" />
              </div>
              <Skeleton className="h-full w-full rounded-none relative mask-[linear-gradient(to_bottom,black_60%,transparent_100%)]" />
              <div className="space-y-4 px-6 mt-20">
                <Skeleton className="h-11 w-3/4" />
                <div className="flex flex-row w-2/3 gap-2">
                  <Skeleton className="h-10 w-32" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
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
                  className="absolute inset-x-0 w-full h-full"
                >
                  <OptimizedImage
                    src={movie.BackdropImageTags && movie.BackdropImageTags.length > 0 && movie.BackdropImageTags[0]
                      ? `/api/media/image/${movie.Id}?imageType=Backdrop&tag=${movie.BackdropImageTags[0]}`
                      : `/api/media/image/${movie.Id}?imageType=Backdrop`
                    }
                    externalId={movie.Id}
                    imageType="Backdrop"
                    alt="Backdrop"
                    width={400}
                    height={225}
                    className={cn(
                      'w-full h-full object-cover',
                      // fade out top and bottom
                      'mask-[linear-gradient(to_bottom,transparent,black_12%,black_50%,transparent)]',
                      'mask-no-repeat'
                    )}
                  />
                </motion.div>

                {/* Header Content */}
                <div className="absolute bottom-4 left-4 right-4 flex items-end gap-3">
                  <OptimizedImage
                    src={movie.ImageTags?.Primary 
                      ? `/api/media/image/${movie.Id}?tag=${movie.ImageTags?.Primary}`
                      : `/api/media/image/${movie.Id}?imageType=Primary`
                    }
                    externalId={movie.Id}
                    imageType="Primary"
                    width={75}
                    height={125}
                    className="w-28 h-40 rounded-lg shadow-2xl shadow-background border border-foreground/10 object-cover z-10 shrink-0"
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
                    <h2 className="text-3xl font-bold leading-tight drop-shadow-lg text-foreground mb-1 line-clamp-2">
                      {movie.Name}
                    </h2>
                    {!!movie.OriginalTitle && movie.OriginalTitle !== movie.Name && (
                      <div className="text-sm text-foreground/60 mb-2 truncate italic">
                        {movie.OriginalTitle}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs items-center">
                      {!!movie.ProductionYear && (
                        <span className="font-semibold text-foreground/90">
                          {movie.ProductionYear}
                        </span>
                      )}
                      {!!movie.OfficialRating && (
                        <Badge variant="outline" className="text-[10px] py-0 h-4 border-foreground/30 text-foreground/80">
                          <ShieldCheck className="w-3 h-3"/>
                          <span className="mt-px">{movie.OfficialRating}</span>
                        </Badge>
                      )}
                      {!!movie.CommunityRating && (
                        <span className="flex items-center gap-1 font-bold">
                          <Star className="w-3 h-3 fill-current" />
                          {movie.CommunityRating.toFixed(1)}
                        </span>
                      )}
                      {!!movie.RunTimeTicks && (
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
                  {capabilities.requiresServerUrl ? (
                    <Link href={`${serverPublicUrl}/web/index.html#/details?id=${movie.Id}&context=home`} className="w-32">
                      <Button className="w-32" size="lg">
                        <Play className="w-4 h-4 mr-2 fill-current" /> Play
                      </Button>
                    </Link>
                  ) : (
                    <Link 
                      href={`${TMDB_MOVIE_BASE_URL}/${movie.Id}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="w-32"
                    >
                      <Button className="w-32" size="lg">
                        <ExternalLink className="w-4 h-4 mr-2" /> See more
                      </Button>
                    </Link>
                  )}
                  {!isGuest && capabilities.hasWatchlist && (
                    <Button
                      className="w-32"
                      size="lg"
                      variant={isInList ? "outline" : "secondary"}
                      onClick={() => handleToggleWatchlist()}
                      disabled={isTogglingWatchlist}
                    >
                      {useWatchlist ?
                        <Bookmark className={cn("w-4 h-4 mr-2", isInList && "fill-foreground")} />
                        : <Star className={cn("w-4 h-4 mr-2", isInList && "fill-foreground")} />
                      }
                      {useWatchlist ? "Watchlist" : "Favorite"}
                    </Button>
                  )}
                  {isLikedByMe && <Button
                    variant="outline"
                    size="lg"
                    className="shrink-0 aspect-square p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlike();
                    }}
                    disabled={isUnliking}
                  >
                    <HeartOff className="w-5 h-5" />
                  </Button>}
                </div>

                {/* LIKED BY */}
                {showLikedBy && movie.likedBy && movie.likedBy.length > 0 && (movie as any).sessionCode && (
                  <div className="mb-8 bg-muted/20 p-4 rounded-xl border border-border/50">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3" >Liked By</h3>
                    <UserAvatarList users={movie.likedBy} size="lg" />
                  </div>
                )}

                {/* WATCH PROVIDERS */}
                {movie.WatchProviders && movie.WatchProviders.length > 0 && (
                  <div className="mb-8 bg-muted/20 p-4 rounded-xl border border-border/50">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                      Available On
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {movie.WatchProviders.map((provider: WatchProvider) => (
                        <div key={provider.Id} className="flex items-center gap-2 bg-background/50 border rounded-lg px-2.5 py-1.5 shadow-sm">
                          <div className="relative size-5 overflow-hidden rounded">
                            <OptimizedImage
                              src={`https://image.tmdb.org/t/p/w92${provider.LogoPath}`}
                              alt={provider.Name}
                              className="object-cover"
                              unoptimized
                              width={20}
                              height={20}
                            />
                          </div>
                          <span className="text-[11px] font-medium leading-none">{provider.Name}</span>
                        </div>
                      ))}
                    </div>
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
                              src={`/api/media/image/${person.Id}?tag=${person.PrimaryImageTag || person.Id}`}
                              className="object-cover"
                            />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {person.Name.split(" ").map((n: string) => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col gap-0.5">
                            <div className="text-sm font-bold text-foreground leading-tight line-clamp-2 w-20">{person.Name}</div>
                            <div className="text-xs text-muted-foreground leading-tight line-clamp-2 w-20">{person.Role}</div>
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
