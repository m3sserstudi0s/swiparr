"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useState } from "react";
import { LikesFilter } from "./LikesFilter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MovieDetailView } from "../movie/MovieDetailView";
import { MovieListItem } from "../movie/MovieListItem";
import { type MergedLike } from "@/types/swiparr";

export function LikesList() {
    const [sortBy, setSortBy] = useState("date");
    const [filterMode, setFilterMode] = useState("all");
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const { data: likes, isLoading } = useQuery<MergedLike[]>({
        queryKey: ["likes", sortBy, filterMode],
        queryFn: async () => {
            const res = await axios.get<MergedLike[]>("/api/user/likes", {
                params: { sortBy, filter: filterMode }
            });
            return res.data;
        }
    });

    return (
        <div className="w-full mx-auto h-[80vh] max-w-sm flex flex-col">
            {/* Header w/ Filter */}
            <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-sm text-muted-foreground font-medium">Showing {likes?.length || 0} likes</h2>
                <LikesFilter
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    filterMode={filterMode}
                    setFilterMode={setFilterMode}
                />
            </div>

            {/* List Content */}
            <ScrollArea className="flex-1 rounded-md">
                {isLoading && <LikesSkeleton />}

                {!isLoading && likes?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <p>No movies found.</p>
                    </div>
                )}

                {likes?.map((movie: MergedLike) => (
                     <MovieListItem
                        key={movie.Id} 
                        movie={movie} 
                        onClick={() => setSelectedId(movie.Id)} 
                    />
                ))}
            </ScrollArea>

            {/* MOUNT THE MODAL */}
            <MovieDetailView
                movieId={selectedId}
                onClose={() => setSelectedId(null)}
            />
        </div>
    )
}

function LikesSkeleton() {
    return (
        <div className="space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 p-3">
                    <Skeleton className="w-20 h-28 rounded-md" />
                    <div className="flex-1 space-y-2 py-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/4" />
                        <Skeleton className="h-8 w-full mt-4" />
                    </div>
                </div>
            ))}
        </div>
    )
}
