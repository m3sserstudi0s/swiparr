"use client";

import { useState } from "react";
import { LikesFilter } from "./LikesFilter";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useMovieDetail } from "../movie/MovieDetailProvider";
import { MovieListItem } from "../movie/MovieListItem";
import { RandomMovieButton } from "../movie/RandomMovieButton";
import { type MergedLike } from "@/types";
import { useLikes } from "@/hooks/api";

import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from "@/components/ui/empty"
import { Heart } from "lucide-react";

export function LikesList() {
    const [sortBy, setSortBy] = useState("date");
    const [filterMode, setFilterMode] = useState("all");
    const { openMovie } = useMovieDetail();

    const { data: likes, isLoading } = useLikes(sortBy, filterMode);

    return (
        <div className="relative w-full mx-auto h-[calc(100svh-115px)] flex flex-col">
            {/* Header w/ Filter */}
            <div className="flex items-center justify-between">
                <h2 className="text-sm text-muted-foreground font-medium">Showing {isLoading ? '?' : likes?.length || 0} {likes?.length == 1 ? 'like' : 'likes'}</h2>
                <LikesFilter
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                    filterMode={filterMode}
                    setFilterMode={setFilterMode}
                />
            </div>

            {/* List Content */}
            <ScrollArea className="flex-1 h-[calc(100svh-155px)] -mr-5 pr-5">
                {isLoading && <LikesSkeleton />}

                {!isLoading && likes?.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Heart />
                                </EmptyMedia>
                                <EmptyTitle className="text-foreground">No likes yet</EmptyTitle>
                                <EmptyDescription>
                                    You haven&apos;t liked any movies yet. Get started by swiping
                                    your first movie.
                                </EmptyDescription>
                            </EmptyHeader>
                        </Empty>
                    </div>
                )}
                <div className="mt-7 mb-14">
                {likes?.map((movie: MergedLike) => (
                    <MovieListItem
                        key={movie.Id}
                        movie={movie}
                        onClick={() => openMovie(movie.Id, { sessionCode: movie.sessionCode })}
                        isLiked={true}
                    />
                ))}
                </div>
            </ScrollArea>

            <RandomMovieButton 
                items={likes} 
                className="absolute bottom-5 right-5 z-3" 
            />
        </div>
    )
}

function LikesSkeleton() {
    return (
        <div className="space-y-4 mt-5">
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
