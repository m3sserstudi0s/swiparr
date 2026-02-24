"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SmoothAvatar } from "@/components/ui/smooth-avatar";
import { HybridTooltip, HybridTooltipContent, HybridTooltipTrigger } from "@/components/ui/hybrid-tooltip";
import { cn } from "@/lib/utils";


interface Member {
    userId: string;
    userName: string;
    hasCustomProfilePicture?: boolean;
    profileUpdatedAt?: string;
}

interface UserAvatarListProps {
    users: Member[];
    size?: "sm" | "md" | "lg";
    className?: string;
}

export function UserAvatarList({ users, size = "md", className }: UserAvatarListProps) {
    const sizeClasses = {
        sm: "w-5 h-5",
        md: "w-8 h-8",
        lg: "w-10 h-10",
    };

    const overlapClasses = {
        sm: "-space-x-1.5",
        md: "-space-x-2",
        lg: "-space-x-3",
    };

    const grays = [
    "bg-purple-200 text-neutral-900",  // soft
    "bg-emerald-600 text-white",       // bold
    "bg-amber-200 text-neutral-900",   // soft
    "bg-cyan-600 text-white",          // bold
    "bg-pink-200 text-neutral-900",    // soft
    "bg-indigo-600 text-white",        // bold
    "bg-teal-200 text-neutral-900",    // soft
    "bg-rose-600 text-white",          // bold
    "bg-sky-200 text-neutral-900",     // soft
    "bg-lime-600 text-neutral-900",    // bold
    ];

    const maxVisible = 5;
    const displayUsers = users.slice(0, maxVisible);
    const remainingCount = users.length - maxVisible;

    return (
        <div className={cn("flex overflow-hidden", overlapClasses[size], className)}>
            {displayUsers.map((user, index) => (
                <HybridTooltip key={user.userId}>
                    <HybridTooltipTrigger asChild>
                        <div className={cn("inline-block border-2 border-background/20 rounded-full", sizeClasses[size])}>
                            <SmoothAvatar 
                                userId={user.userId} 
                                userName={user.userName} 
                                hasImage={user.hasCustomProfilePicture}
                                updatedAt={user.profileUpdatedAt}
                                className="size-full"
                                fallbackClassName={cn(
                                    "font-semibold",
                                    size === "sm" ? "text-[10px]" : "text-sm",
                                    grays[index % grays.length]
                                )}
                            />
                        </div>
                    </HybridTooltipTrigger>
                    <HybridTooltipContent className="py-2 px-3 w-fit">
                        <p>{user.userName}</p>
                    </HybridTooltipContent>
                </HybridTooltip>
            ))}
            {remainingCount > 0 && (
                <HybridTooltip>
                    <HybridTooltipTrigger asChild>
                        <Avatar className={cn("inline-block border-2 border-background/20", sizeClasses[size])}>
                            <AvatarFallback
                                className={cn(
                                    "bg-neutral-800 text-neutral-50 font-semibold",
                                    size === "sm" ? "text-[10px]" : "text-sm"
                                )}
                            >
                                +{remainingCount}
                            </AvatarFallback>
                        </Avatar>
                    </HybridTooltipTrigger>
                    <HybridTooltipContent>
                        <p>{users.slice(maxVisible).map(u => u.userName).join(", ")}</p>
                    </HybridTooltipContent>
                </HybridTooltip>
            )}

        </div>
    );
}
