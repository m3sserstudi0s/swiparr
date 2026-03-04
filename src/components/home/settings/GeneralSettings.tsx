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
import { useRuntimeConfig } from "@/lib/runtime-config";
import { ProviderType } from "@/lib/providers/types";
import { useTranslations } from "next-intl";

export function GeneralSettings() {
    const { setTheme, resolvedTheme: theme } = useTheme();
    const { settings, updateSettings } = useSettings();
    const { data: sessionStatus, isLoading } = useSession();
    const runtimeConfig = useRuntimeConfig();
    const updateSession = useUpdateSession();
    const t = useTranslations('SettingsGeneral');
  const tUI = useTranslations('UI');

    const capabilities = sessionStatus?.capabilities || runtimeConfig.capabilities;
    const provider = sessionStatus?.provider || runtimeConfig.provider;
    const showCollectionToggle = provider === ProviderType.JELLYFIN && runtimeConfig.useWatchlist;
    const isGuest = sessionStatus?.isGuest || false;
    const isHost = sessionStatus?.code && sessionStatus?.userId === sessionStatus?.hostUserId;

    const handleToggleGuestLending = (pressed: boolean) => {
        updateSettings({ allowGuestLending: pressed });
        if (isHost) {
            toast.promise(updateSession.mutateAsync({ allowGuestLending: pressed }), {
                loading: t('updatingSession'),
                success: t('sessionUpdated'),
                error: t('failedUpdateSession')
            });
        }
    };

    return (
        <SettingsSection title={t('title')}>
            <div className="grid grid-flow-col items-center justify-between gap-2">
                <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                        <div className="text-sm font-medium">{t('themeTitle')}</div>
                    </div>
                    <div className="text-xs text-muted-foreground text-pretty">{t('themeDesc')}</div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="w-26"
                >
                    {theme === "light" ? (
                        <><Sun className="size-4" /> {t('lightMode')}</>
                    ) : (
                        <><Moon className="size-4" /> {t('darkMode')}</>
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
            ) : (
                <>
                    {showCollectionToggle && (
                        <div className="grid grid-flow-col items-center justify-between gap-2">
                            <div className="space-y-0.5">
                                <div className="text-sm font-medium">{t('collectionTitle')}</div>
                                <div className="text-xs text-muted-foreground text-pretty">{t('collectionDesc')}</div>
                            </div>
                            <Toggle
                                pressed={settings.useWatchlist}
                                onPressedChange={(pressed) => updateSettings({ useWatchlist: pressed })}
                                variant="outline"
                                size="sm"
                                className="w-26"
                            >
                                {settings.useWatchlist ? <Bookmark className="size-4" /> : <Star className="size-4" />}
                                {settings.useWatchlist ? tUI('watchlist') : t('favoritesBtn')}
                            </Toggle>
                        </div>
                    )}

                    {capabilities.hasAuth && !isGuest && (
                        <div className="grid grid-flow-col items-center justify-between gap-2">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                    <div className="text-sm font-medium">{t('guestLendingTitle')}</div>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="size-4 p-0 hover:bg-transparent">
                                                <Info className="size-3.5 text-muted-foreground cursor-help" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>{t('guestLendingTitle')}</DialogTitle>
                                                <DialogDescription className="pt-2">
                                                    {t('guestLendingDialogDesc1')}
                                                    <br />
                                                    {t('guestLendingDialogDesc2')}
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button type="button" variant="secondary">
                                                        {t('okayBtn')}
                                                    </Button>
                                                </DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <div className="text-xs text-muted-foreground text-pretty">{t('guestLendingDesc')}</div>
                            </div>
                            <Toggle
                                pressed={settings.allowGuestLending}
                                onPressedChange={handleToggleGuestLending}
                                variant="outline"
                                size="sm"
                                className="w-26"
                            >
                                {settings.allowGuestLending ? <Users className="size-4" /> : <UserX className="size-4" />}
                                {settings.allowGuestLending ? t('enabled') : t('disabled')}
                            </Toggle>
                        </div>
                    )}
                </>
            )}
        </SettingsSection>
    );
}
