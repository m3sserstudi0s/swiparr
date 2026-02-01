"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Member {
    userId: string;
    userName: string;
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
        "bg-neutral-200 text-neutral-800",
        "bg-neutral-300 text-neutral-900",
        "bg-neutral-400 text-neutral-50",
        "bg-neutral-500 text-neutral-50",
        "bg-neutral-600 text-neutral-50",
    ];

    const maxVisible = 5;
    const displayUsers = users.slice(0, maxVisible);
    const remainingCount = users.length - maxVisible;

    return (
        <div className={cn("flex overflow-hidden", overlapClasses[size], className)}>
            {displayUsers.map((user, index) => (
                <Tooltip key={user.userId}>
                    <TooltipTrigger asChild>
                        <Avatar className={cn("inline-block border-2 border-background/20", sizeClasses[size])}>
                            <AvatarImage src={`/api/media/image/${user.userId}?type=user`} />
                            <AvatarFallback
                                className={cn(
                                    "font-semibold",
                                    size === "sm" ? "text-[10px]" : "text-sm",
                                    grays[index % grays.length]
                                )}
                            >
                                {user.userName.substring(0, 1).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{user.userName}</p>
                    </TooltipContent>
                </Tooltip>
            ))}
            {remainingCount > 0 && (
                <Tooltip>
                    <TooltipTrigger asChild>
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
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{users.slice(maxVisible).map(u => u.userName).join(", ")}</p>
                    </TooltipContent>
                </Tooltip>
            )}
        </div>
    );
}
