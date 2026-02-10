"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
    hasImage?: boolean;
    updatedAt?: string;
}

export function SmoothAvatar({ 
    userId, 
    userName, 
    className, 
    fallbackClassName, 
    hasImage,
    updatedAt 
}: SmoothAvatarProps) {
    const isActuallyUser = userId && userId !== "undefined";
    const { profileUpdateTicket } = useUserStore();
    const { data: session } = useSession();
    
    const isCurrentUser = session?.userId === userId || session?.effectiveUserId === userId;
    const hasAuth = !!session?.capabilities?.hasAuth;
    
    // Determine if we should attempt to load an image
    // If hasImage is explicitly provided, respect it, unless we have auth capabilities (provider images)
    // If it's the current user, we can trust session.hasCustomProfilePicture.
    // We use !! to handle potential 0/1 from database
    const knownNoImage = (hasImage !== undefined && !hasImage && !hasAuth) || (isCurrentUser && session?.hasCustomProfilePicture === false && !hasAuth);

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>(() => {
        if (!isActuallyUser || knownNoImage) return 'error';
        return 'loading';
    });
    
    // Construct the URL with versioning for caching
    // 1. For current user, use the local store ticket (for instant updates)
    // 2. For others, use the provided updatedAt timestamp
    const version = isCurrentUser ? profileUpdateTicket : updatedAt;
    const imageUrl = isActuallyUser && !knownNoImage
        ? `/api/user/profile-picture/${userId}${version ? `?v=${version}` : ""}`
        : null;

    const initials = userName ? userName.substring(0, 1).toUpperCase() : "?";

    // Re-evaluate status when knowledge changes
    useEffect(() => {
        if (knownNoImage) {
            setStatus('error');
        } else if (imageUrl) {
            setStatus('loading');
        }
    }, [knownNoImage, imageUrl]);

    return (
        <div className={cn("relative flex shrink-0 overflow-hidden rounded-full bg-muted", className)}>
            {/* Initials Layer (Bottom) */}
            {(status === 'error' || !imageUrl) && (
                <div className={cn(
                    "absolute inset-0 flex items-center justify-center font-semibold text-muted-foreground select-none animate-in fade-in duration-300",
                    fallbackClassName
                )}>
                    {initials}
                </div>
            )}

            {/* Skeleton Layer (Middle) */}
            {status === 'loading' && (
                <Skeleton className="absolute inset-0 z-10 size-full rounded-full" />
            )}

            {/* Image Layer (Top) */}
            {imageUrl && (
                <Image 
                    src={imageUrl} 
                    alt={userName}
                    fill
                    unoptimized
                    priority={isCurrentUser}
                    className={cn(
                        "object-cover transition-opacity duration-300",
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
