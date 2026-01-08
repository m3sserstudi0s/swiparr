"use client";

import { User, Shield, UserCircle, UserPlus } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import useSWR from "swr";
import { fetcher } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function AccountSettings() {
    const { data: sessionStatus, isLoading } = useSWR("/api/session", fetcher);

    if (isLoading) {
        return (
            <SettingsSection title="Account">
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                    <Skeleton className="size-10 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                    </div>
                </div>
            </SettingsSection>
        );
    }

    const { userName, userId, isGuest, isAdmin } = sessionStatus || {};

    return (
        <SettingsSection title="Account">
            <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <Avatar className="inline-block">
                    <AvatarImage src={`/api/jellyfin/image/${userId}?type=user`} />
                    <AvatarFallback
                        className="font-semibold"
                    >
                        {userName.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-base font-medium truncate">{userName || "Unknown User"}</span>
                        {isAdmin && (
                            <Badge variant="secondary" className="px-1 py-0 h-4 text-[10px] uppercase font-bold tracking-tighter">
                                Admin
                            </Badge>
                        )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {isGuest ? (
                            <>
                                <UserPlus className="size-3" />
                                Guest Account
                            </>
                        ) : (
                            <>
                                <Shield className="size-3" />
                                Jellyfin Account
                            </>
                        )}
                    </div>
                </div>
            </div>
        </SettingsSection>
    );
}
