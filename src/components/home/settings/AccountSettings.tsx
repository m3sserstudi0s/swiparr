"use client";

import { Shield, UserPlus, Globe } from "lucide-react";
import { SettingsSection } from "./SettingsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession } from "@/hooks/api";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { ProfilePicturePicker } from "../../profile/ProfilePicturePicker";
import { apiClient } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useUserStore } from "@/lib/user-store";
import { ProviderType } from "@/lib/providers/types";

export function AccountSettings() {
    const { data: sessionStatus, isLoading } = useSession();
    const runtimeConfig = useRuntimeConfig();
    const queryClient = useQueryClient();
    const { notifyProfileUpdate, profileUpdateTicket } = useUserStore();


    if (isLoading || !sessionStatus) {
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

    const { userName, userId, isGuest, isAdmin, provider, hasCustomProfilePicture } = sessionStatus;
    const { capabilities, provider: runtimeProvider } = runtimeConfig;
    const activeProvider = provider || runtimeProvider;

    const handleUpload = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        await apiClient.post("/api/user/profile-picture", formData);
        // Refresh session/images
        queryClient.invalidateQueries({ queryKey: ["session"] });
        notifyProfileUpdate();
    };

    const handleDelete = async () => {
        await apiClient.delete("/api/user/profile-picture");
        // Refresh session/images
        queryClient.invalidateQueries({ queryKey: ["session"] });
        notifyProfileUpdate();
    };

    const profileImageUrl = `/api/user/profile-picture/${userId}?v=${profileUpdateTicket}`;

    return (
        <SettingsSection title="Profile">
            <div className="flex items-center gap-4 p-3 rounded-lg border bg-muted/50">
                <ProfilePicturePicker 
                    currentImage={profileImageUrl}
                    hasCustomImage={hasCustomProfilePicture}
                    userName={userName}
                    onUpload={handleUpload}
                    onDelete={handleDelete}
                    size="sm"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className="text-base font-medium truncate">{userName}</span>
                        {isAdmin && (
                            <Badge variant='outline' className="text-[10px] h-4 px-1.5 uppercase tracking-wider">
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
                        ) : !capabilities.hasAuth ? (
                            <>
                                <Globe className="size-3" />
                                Universal Profile
                            </>
                        ) : (
                            <>
                                <Shield className="size-3" />
                                {activeProvider === ProviderType.TMDB ? activeProvider.toUpperCase() + ' Profile' : activeProvider.charAt(0).toUpperCase() + activeProvider.slice(1) + ' Account'}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </SettingsSection>
    );
}

