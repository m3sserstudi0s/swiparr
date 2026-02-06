"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/api";

interface SmoothAvatarProps {
    userId: string;
    userName: string;
    className?: string;
    fallbackClassName?: string;
    size?: string;
}

export function SmoothAvatar({ userId, userName, className, fallbackClassName, size }: SmoothAvatarProps) {
    const { data: sessionStatus } = useSession();
    const [isLoaded, setIsLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    // We use a simple hash of the user state or just a fixed cache key
    // Actually, simply using a timestamp that updates when session updates is enough
    const version = sessionStatus ? "v1" : "v0"; 
    
    const imageUrl = userId && userId !== "undefined" && userId !== "null"
        ? `/api/media/image/${userId}?type=user&_=${version}`
        : null;
    
    // Reset state when userId changes
    useEffect(() => {
        setIsLoaded(false);
        setImageError(false);
    }, [userId]);

    return (
        <Avatar className={cn("relative overflow-hidden", className)}>
            {!isLoaded && !imageError && imageUrl && (
                <Skeleton className="absolute inset-0 size-full rounded-full" />
            )}
            
            {imageUrl && (
                <AvatarImage 
                    src={imageUrl} 
                    className={cn(
                        "object-cover transition-opacity duration-300",
                        isLoaded ? "opacity-100" : "opacity-0"
                    )}
                    onLoadingStatusChange={(status) => {
                        if (status === "loaded") {
                            setIsLoaded(true);
                            setImageError(false);
                        }
                        if (status === "error") {
                            setImageError(true);
                        }
                    }}
                />
            )}
            
            {(imageError || !imageUrl) && (
                <AvatarFallback className={cn("font-semibold", fallbackClassName)}>
                    {userName ? userName.substring(0, 1).toUpperCase() : "?"}
                </AvatarFallback>
            )}
        </Avatar>
    );
}
