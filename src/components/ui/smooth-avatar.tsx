"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/lib/user-store";
import { useSession } from "@/hooks/api";
import { Skeleton } from "@/components/ui/skeleton";

interface SmoothAvatarProps {
    userId: string;
    userName: string;
    className?: string;
    fallbackClassName?: string;
    size?: string;
}

export function SmoothAvatar({ userId, userName, className, fallbackClassName }: SmoothAvatarProps) {
    const isActuallyUser = userId && userId !== "undefined";
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>(isActuallyUser ? 'loading' : 'error');
    const { profileUpdateTicket } = useUserStore();
    const { data: session } = useSession();
    
    const isCurrentUser = session?.userId === userId || session?.effectiveUserId === userId;
    
    const imageUrl = userId && userId !== "undefined"
        ? `/api/user/profile-picture/${userId}${isCurrentUser ? `?v=${profileUpdateTicket}` : ""}`
        : null;

    const initials = userName ? userName.substring(0, 1).toUpperCase() : "?";

    useEffect(() => {
        if (imageUrl) {
            setStatus('loading');
        } else {
            setStatus('error');
        }
    }, [imageUrl]);

    return (
        <div className={cn("relative flex shrink-0 overflow-hidden rounded-full bg-muted", className)}>
            {/* Initials Layer (Bottom) - Show if we're sure there's an error or no image */}
            {(status === 'error' || !imageUrl) && (
                <div className={cn(
                    "absolute inset-0 flex items-center justify-center font-semibold text-muted-foreground select-none animate-in fade-in duration-300",
                    fallbackClassName
                )}>
                    {initials}
                </div>
            )}

            {/* Skeleton Layer (Middle) - Show while loading, fade out when success/error */}
            {status === 'loading' && (
                <Skeleton className="absolute inset-0 z-10 size-full rounded-full" />
            )}

            {/* Image Layer (Top) */}
            {imageUrl && status !== 'error' && (
                <img 
                    src={imageUrl} 
                    alt={userName}
                    className={cn(
                        "aspect-square h-full w-full object-cover transition-opacity duration-500",
                        status === 'success' ? "opacity-100" : "opacity-0"
                    )}
                    onLoad={() => setStatus('success')}
                    onError={() => {
                        console.warn(`Failed to load avatar for ${userName} (${userId})`);
                        setStatus('error');
                    }}
                />
            )}
        </div>
    );
}
