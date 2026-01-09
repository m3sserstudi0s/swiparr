"use client";

import { Sun, Moon, Bookmark, Star, Users, Info, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "next-themes";
import { useSettings } from "@/lib/settings";
import { SettingsSection } from "./SettingsSection";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession, useUpdateSession } from "@/hooks/api";
import { toast } from "sonner";

export function GeneralSettings() {
    const { setTheme, resolvedTheme: theme } = useTheme();
    const { settings, updateSettings } = useSettings();
    const { data: sessionStatus, isLoading } = useSession();
    const updateSession = useUpdateSession();

    const isGuest = sessionStatus?.isGuest || false;
    const isHost = sessionStatus?.code && sessionStatus?.userId === sessionStatus?.hostUserId;

    const handleToggleGuestLending = (pressed: boolean) => {
        updateSettings({ allowGuestLending: pressed });
        if (isHost) {
            toast.promise(updateSession.mutateAsync({ allowGuestLending: pressed }), {
                loading: "Updating session...",
                success: "Guest lending updated for current session",
                error: "Failed to update session"
            });
        }
    };

    return (
        <SettingsSection title="General">
            <div className="grid grid-flow-col items-center justify-between gap-2">
                <div className="space-y-0.5">
                    <div className="text-sm font-medium">Theme</div>
                    <div className="text-xs text-muted-foreground text-pretty">Switch between light and dark mode</div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="w-26"
                >
                    {theme === "light" ? (
                        <><Sun className="size-4" /> Light</>
                    ) : (
                        <><Moon className="size-4" /> Dark</>
                    )}
                </Button>
            </div>

            {isLoading ? (
                <>
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="grid grid-flow-col items-center justify-between gap-2">
                            <div className="space-y-0.5">
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-3 w-48" />
                            </div>
                            <Skeleton className="h-9 w-26 rounded-md" />
                        </div>
                    ))}
                </>
            ) : !isGuest && (
                <>
                    <div className="grid grid-flow-col items-center justify-between gap-2">
                        <div className="space-y-0.5">
                            <div className="text-sm font-medium">Collection Type</div>
                            <div className="text-xs text-muted-foreground text-pretty">Toggle between Watchlist and Favorites</div>
                        </div>
                        <Toggle
                            pressed={settings.useWatchlist}
                            onPressedChange={(pressed) => updateSettings({ useWatchlist: pressed })}
                            variant="outline"
                            size="sm"
                            className="w-26"
                        >
                            {settings.useWatchlist ? <Bookmark className="size-4" /> : <Star className="size-4" />}
                            {settings.useWatchlist ? "Watchlist" : "Favorites"}
                        </Toggle>
                    </div>

                    <div className="grid grid-flow-col items-center justify-between gap-2">
                        <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                                <div className="text-sm font-medium">Guest Lending</div>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="size-4 p-0 hover:bg-transparent">
                                            <Info className="size-3.5 text-muted-foreground cursor-help" />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Guest Lending</DialogTitle>
                                            <DialogDescription className="pt-2">
                                                Allows people to join your session as guests without needing their own Jellyfin account.
                                                They will use your connection to fetch movies and images for the duration of the session.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <DialogFooter className="sm:justify-start">
                                            <DialogClose asChild>
                                                <Button type="button" variant="secondary">
                                                    Okay
                                                </Button>
                                            </DialogClose>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>
                            <div className="text-xs text-muted-foreground text-pretty">Let others join without an account</div>
                        </div>
                        <Toggle
                            pressed={settings.allowGuestLending}
                            onPressedChange={handleToggleGuestLending}
                            variant="outline"
                            size="sm"
                            className="w-26"
                        >
                            {settings.allowGuestLending ? <Users className="size-4" /> : <UserX className="size-4" />}
                            {settings.allowGuestLending ? "Enabled" : "Disabled"}
                        </Toggle>
                    </div>
                </>
            )}
        </SettingsSection>
    );
}
