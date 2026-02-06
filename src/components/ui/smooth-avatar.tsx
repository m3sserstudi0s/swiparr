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
    
    const globalVersion = sessionStatus?.globalVersion || 0;
    const imageUrl = `/api/media/image/${userId}?type=user&v=${globalVersion}`;

    // Reset state when userId or globalVersion changes
    useEffect(() => {
        setIsLoaded(false);
        setImageError(false);
    }, [userId, globalVersion]);

    return (
        <Avatar className={cn("relative overflow-hidden", className)}>
            {!isLoaded && !imageError && (
                <Skeleton className="absolute inset-0 size-full rounded-full animate-pulse" />
            )}
            
            <AvatarImage 
                src={imageUrl} 
                className={cn(
                    "object-cover transition-opacity duration-300",
                    isLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoadingStatusChange={(status) => {
                    if (status === "loaded") setIsLoaded(true);
                    if (status === "error") setImageError(true);
                }}
            />
            
            {(imageError || (isLoaded && !imageUrl)) && (
                <AvatarFallback className={cn("font-semibold", fallbackClassName)}>
                    {userName.substring(0, 1).toUpperCase()}
                </AvatarFallback>
            )}
            
            {/* If we haven't loaded yet and haven't errored, we don't show the fallback yet to avoid the flash */}
            {!isLoaded && imageError && (
                 <AvatarFallback className={cn("font-semibold", fallbackClassName)}>
                    {userName.substring(0, 1).toUpperCase()}
                </AvatarFallback>
            )}
        </Avatar>
    );
}
