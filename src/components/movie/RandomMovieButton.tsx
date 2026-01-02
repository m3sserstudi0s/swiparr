"use client";

import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMovieDetail } from "./MovieDetailProvider";
import { JellyfinItem } from "@/types/swiparr";
import { cn } from "@/lib/utils";

interface RandomMovieButtonProps {
    items: JellyfinItem[] | undefined;
    className?: string;
}

export function RandomMovieButton({ items, className }: RandomMovieButtonProps) {
    const { openMovie } = useMovieDetail();

    const handleRandomMovie = () => {
        if (!items || items.length === 0) {
            toast.error("No items found");
            return;
        }
        const randomIndex = Math.floor(Math.random() * items.length);
        const randomMovie = items[randomIndex];
        openMovie(randomMovie.Id);
        toast.success(
            <p>
                Randomly picked <span className="font-semibold italic">{randomMovie.Name}</span>
            </p>
        );
    };

    if (!items || items.length === 0) return null;

    return (
        <Button
            className={cn("scale-150 backdrop-blur-sm group", className)}
            variant="outline"
            size="icon"
            onClick={handleRandomMovie}
        >
            <Dices className="transform group-hover:rotate-360 group-hover:scale-85 transition-transform duration-500" />
        </Button>
    );
}
