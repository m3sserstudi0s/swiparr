"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SmoothAvatar } from "@/components/ui/smooth-avatar";
import { HybridTooltip, HybridTooltipContent, HybridTooltipTrigger } from "@/components/ui/hybrid-tooltip";
import { cn } from "@/lib/utils";
import { useSession } from "@/hooks/api";
import { Crown } from "lucide-react";


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
    const { data: session } = useSession();
    const hostUserId = session?.hostUserId || null;

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
    "bg-indigo-100 text-neutral-900",  // soft
    "bg-amber-100 text-neutral-900",   // soft
    "bg-pink-100 text-neutral-900",    // soft
    "bg-teal-100 text-neutral-900",    // soft
    "bg-sky-100 text-neutral-900",     // soft
    "bg-violet-100 text-neutral-900",  // soft
    "bg-orange-100 text-neutral-900",   // soft
    "bg-rose-100 text-neutral-900",    // soft
    "bg-aqua-100 text-neutral-900",    // soft
    "bg-indigo-100 text-neutral-900",     // soft
    ];

    const maxVisible = 5;
    const orderedUsers = hostUserId
        ? [
            ...users.filter((user) => user.userId === hostUserId),
            ...users.filter((user) => user.userId !== hostUserId),
        ]
        : users;
    
    // const testUsers = [...orderedUsers, ...orderedUsers, ...orderedUsers, ...orderedUsers]
    // const displayUsers = testUsers.slice(0, maxVisible);
    // const remainingCount = testUsers.length - maxVisible;

    const displayUsers = orderedUsers.slice(0, maxVisible);
    const remainingCount = orderedUsers.length - maxVisible;

    return (
        <div className={cn("flex overflow-hidden", overlapClasses[size], className)}>
            {displayUsers.map((user, index) => {
                const isHost = !!hostUserId && user.userId === hostUserId;
                return (
                <HybridTooltip key={user.userId}>
                    <HybridTooltipTrigger asChild>
                        <div className={cn("inline-block border-2 border-background/20 rounded-full", sizeClasses[size])}>
                            <SmoothAvatar 
                                userId={user.userId} 
                                userName={user.userName} 
                                hasImage={user.hasCustomProfilePicture}
                                updatedAt={user.profileUpdatedAt}
                                className={cn("size-full", isHost && "bg-background")}
                                fallbackClassName={cn(
                                    size === "sm" ? "text-[10px]/0 font-semibold" : "text-sm/0 font-semibold",
                                    isHost ? "bg-accent text-foreground" : grays[(index - 1) % grays.length]
                                )}
                            />
                        </div>
                    </HybridTooltipTrigger>
                    <HybridTooltipContent className="py-2 px-3 w-fit">
                        {isHost ? (
                            <p className="inline-flex items-center gap-1 text-sm">
                                <Crown className="size-3.5 fill-accent" />
                                {user.userName}
                            </p>
                        ) : (
                            <p className="text-sm">{user.userName}</p>
                        )}
                    </HybridTooltipContent>
                </HybridTooltip>
                );
            })}
            {remainingCount > 0 && (
                <HybridTooltip>
                    <HybridTooltipTrigger asChild>
                        <Avatar className={cn("inline-block border-2 border-background/20", sizeClasses[size])}>
                            <AvatarFallback
                                className={cn(
                                    "bg-background text-foreground font-light text-[10px]/0",
                                    size === "sm" ? "text-[7px]/0" : "text-[10px]/0"
                                )}
                            >
                                +{remainingCount}
                            </AvatarFallback>
                        </Avatar>
                    </HybridTooltipTrigger>
                    <HybridTooltipContent>
                        <p>{orderedUsers.slice(maxVisible).map(u => u.userName).join(", ")}</p>
                    </HybridTooltipContent>
                </HybridTooltip>
            )}

        </div>
    );
}
