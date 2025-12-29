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

    return (
        <div className={cn("flex overflow-hidden", overlapClasses[size], className)}>
            {users.map((user) => (
                <Tooltip key={user.userId}>
                    <TooltipTrigger asChild>
                        <Avatar className={cn("inline-block", sizeClasses[size])}>
                            <AvatarImage src={`/api/jellyfin/image/${user.userId}?type=user`} />
                            <AvatarFallback className={size === "sm" ? "text-[8px]" : "text-default"}>
                                {user.userName.substring(0, 1).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{user.userName}</p>
                    </TooltipContent>
                </Tooltip>
            ))}
        </div>
    );
}
