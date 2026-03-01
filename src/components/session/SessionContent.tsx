"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Users } from "lucide-react";
import { useMovieDetail } from "../movie/MovieDetailProvider";
import { RandomMovieButton } from "../movie/RandomMovieButton";
import { toast } from "sonner";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { SessionHeader } from "./SessionHeader";
import { SessionCodeSection } from "./SessionCodeSection";
import { MatchesList } from "./MatchesList";
import { SessionAlert } from "./SessionAlert";
import { getErrorMessage } from "@/lib/utils";
import { getRuntimeConfig } from "@/lib/runtime-config";
import { useHotkeys } from "react-hotkeys-hook";
import { useSettings } from "@/lib/settings";
import {
    useSession,
    useMembers,
    useMatches,
    useCreateSession,
    useJoinSession,
    useLeaveSession
} from "@/hooks/api";
import { apiClient } from "@/lib/api-client";
import { SecureContextCopyFallback } from "../SecureContextCopyFallback";
import { useTranslations } from "next-intl";

export default function SessionContent() {
    const t = useTranslations('Session');
    const tUI = useTranslations('UI');
    const [inputCode, setInputCode] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isFallbackOpen, setIsFallbackOpen] = useState(false);
    const [fallbackValue, setFallbackValue] = useState("");
    const { settings } = useSettings();

    useHotkeys("m, c", () => setIsOpen(prev => !prev), []);
    const { openMovie } = useMovieDetail();
    const searchParams = useSearchParams();
    const router = useRouter();

    const pathname = usePathname();

    const { data: sessionStatus, isLoading: isSessionLoading } = useSession();
    const activeCode = sessionStatus?.code || undefined;
    const isSuccess = !isSessionLoading && !!sessionStatus;
    const joinInProgressRef = useRef(false);

    const { data: members } = useMembers();
    const { data: matches } = useMatches();

    const createSession = useCreateSession();
    const joinSession = useJoinSession();
    const leaveSession = useLeaveSession();

    const handleCreateSession = () => {
        toast.promise(createSession.mutateAsync({ allowGuestLending: settings.allowGuestLending }), {
            loading: t('creatingSession'),
            success: t('sessionCreated'),
            error: (err) => ({
                message: t('failedCreateSession'),
                description: getErrorMessage(err)
            }),
        });
    };

    const handleJoinSession = (code: string) => {
        toast.promise(joinSession.mutateAsync(code), {
            loading: tUI('joiningSession'),
            success: t('connected'),
            error: (err) => ({
                message: t('invalidCode'),
                description: getErrorMessage(err)
            }),
        });
    };

    const handleLeaveSession = async () => {
        try {
            await toast.promise(leaveSession.mutateAsync(), {
                loading: t('leavingSession'),
                success: t('leftSession'),
                error: (err) => ({
                    message: t('failedLeaveSession'),
                    description: getErrorMessage(err)
                }),
            });

            if (sessionStatus?.isGuest) {
                const { basePath } = getRuntimeConfig();
                await apiClient.post("/api/auth/logout");
                window.location.href = `${basePath}/login`;
            }
        } catch (err) {
            // Error handled by toast.promise
        }
    };

    useEffect(() => {
        const joinParam = searchParams.get("join");
        if (!joinParam || !isSuccess || joinInProgressRef.current) return;

        const normalizedJoin = joinParam.trim().toUpperCase();
        const normalizedActive = activeCode?.trim().toUpperCase();

        const removeJoinParam = () => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("join");
            const query = params.toString();
            const newUrl = query ? `${pathname}?${query}` : pathname;
            router.replace(newUrl, { scroll: false });
        };

        if (normalizedActive && normalizedActive === normalizedJoin) {
            removeJoinParam();
            return;
        }

        setIsOpen(true);
        joinInProgressRef.current = true;

        if (!normalizedActive) {
            const joinPromise = joinSession.mutateAsync(normalizedJoin);
            toast.promise(joinPromise, {
                loading: tUI('joiningSession'),
                success: () => {
                    removeJoinParam();
                    return t('connected');
                },
                error: (err) => ({
                    message: t('invalidCode'),
                    description: getErrorMessage(err)
                }),
            });
            joinPromise.finally(() => {
                joinInProgressRef.current = false;
            });
            return;
        }

        const switchPromise = (async () => {
            await leaveSession.mutateAsync();
            await joinSession.mutateAsync(normalizedJoin);
        })();
        toast.promise(
            switchPromise,
            {
                loading: t('switchingSessions'),
                success: () => {
                    removeJoinParam();
                    return t('connected');
                },
                error: (err) => ({
                    message: t('failedSwitchSessions'),
                    description: getErrorMessage(err)
                }),
            }
        );
        switchPromise.finally(() => {
            joinInProgressRef.current = false;
        });
    }, [searchParams, isSuccess, activeCode, router, pathname, joinSession, leaveSession]);

    const handleShare = async () => {
        if (!activeCode) return;
        const { basePath } = getRuntimeConfig();
        const shareUrl = `${window.location.origin}${basePath}/?join=${activeCode}`;

        if (!window.isSecureContext) {
            setFallbackValue(shareUrl);
            setIsFallbackOpen(true);
            return;
        }

        const shareData = {
            title: t('shareTitle'),
            text: t('shareText', { code: activeCode }),
            url: shareUrl
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log("Share cancelled");
            }
        } else if (navigator.clipboard) {
            await navigator.clipboard.writeText(shareUrl);
            toast.success(t('linkCopied'));
        } else {
            setFallbackValue(shareUrl);
            setIsFallbackOpen(true);
        }
    };

    return (
        <>
            <SecureContextCopyFallback
                open={isFallbackOpen}
                onOpenChange={setIsFallbackOpen}
                title={t('shareSession')}
                value={fallbackValue}
            />
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
                <SheetTrigger asChild className="absolute left-6">
                    <Button variant="ghost" size="icon" className="text-foreground size-10 hover:bg-muted/30!">
                        <Users className="size-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="sm:max-w-md w-full px-4 gap-2">
                    <SessionHeader
                        activeCode={activeCode}
                        members={members}
                        currentSettings={sessionStatus?.settings || undefined}
                    />
                    <div className="px-1 w-full h-20 items-center grid">
                        <SessionAlert />
                    </div>
                    <div className="space-y-6 px-1">
                        <SessionCodeSection
                            activeCode={activeCode}
                            inputCode={inputCode}
                            setInputCode={setInputCode}
                            handleJoinSession={handleJoinSession}
                            handleCreateSession={handleCreateSession}
                            handleShare={handleShare}
                            handleLeaveSession={handleLeaveSession}
                            isJoining={joinSession.isPending}
                            isCreating={createSession.isPending}
                            isLeaving={leaveSession.isPending}
                        />
                        <MatchesList
                            activeCode={activeCode}
                            matches={matches}
                            openMovie={openMovie}
                        />
                    </div>
                    <RandomMovieButton
                        items={matches}
                        className="absolute bottom-10 right-10"
                    />
                </SheetContent>
            </Sheet>
        </>
    );
}
