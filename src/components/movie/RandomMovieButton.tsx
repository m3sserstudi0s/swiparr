"use client";

import { Dices } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useMovieDetail } from "./MovieDetailProvider";
import { MediaItem } from "@/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface RandomMovieButtonProps {
    items: MediaItem[] | undefined;
    className?: string;
}

export function RandomMovieButton({ items, className }: RandomMovieButtonProps) {
    const t = useTranslations('Movie');
    const { openMovie } = useMovieDetail();

    const handleRandomMovie = () => {
        if (!items || items.length === 0) {
            toast.error(t('noItemsFound'));
            return;
        }
        const randomIndex = Math.floor(Math.random() * items.length);
        const randomMovie = items[randomIndex];
        openMovie(randomMovie.Id);
        toast.success(
            t.rich('randomlyPicked', {
                name: randomMovie.Name,
                bold: (chunks) => <span className="font-semibold italic">{chunks}</span>
            })
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
