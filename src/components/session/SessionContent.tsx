"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Info, Users, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useSWR, { useSWRConfig } from "swr";
import { useMovieDetail } from "../movie/MovieDetailProvider";
import { RandomMovieButton } from "../movie/RandomMovieButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { JellyfinItem } from "@/types/swiparr";
import { SessionHeader } from "./SessionHeader";
import { SessionCodeSection } from "./SessionCodeSection";
import { MatchesList } from "./MatchesList";
import { SessionAlert } from "./SessionAlert";
import { apiClient, fetcher } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/utils";
import { getRuntimeConfig } from "@/lib/runtime-config";

import { useHotkeys } from "react-hotkeys-hook";
import { useSettings } from "@/lib/settings";

export default function SessionContent() {
    const [inputCode, setInputCode] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const { settings } = useSettings();

    useHotkeys("m, c", () => setIsOpen(prev => !prev), []);
    const { openMovie } = useMovieDetail();
    const queryClient = useQueryClient();
    const { mutate } = useSWRConfig();
    const searchParams = useSearchParams();
    const router = useRouter();

    // -- 1. CHECK CURRENT STATUS --
    const { data: sessionStatus, isLoading: isSessionLoading } = useSWR(
        "/api/session",
        fetcher
    );
    const isSuccess = !isSessionLoading && !!sessionStatus;
    const activeCode = sessionStatus?.code;

    // -- 1.5 FETCH MEMBERS (Using SWR) --
    const { data: members } = useSWR<any[]>(
        activeCode ? ["/api/session/members", activeCode] : null,
        ([url]: [string]) => apiClient.get(url).then(res => res.data)
    );

    // -- 2. HANDLE MATCHES (Using SWR) --
    const { data: matches } = useSWR<JellyfinItem[]>(
        activeCode ? ["/api/session/matches", activeCode] : null,
        ([url]: [string]) => apiClient.get(url).then(res => res.data)
    );

    // -- 3. MUTATIONS --
    const createSession = useMutation({
        mutationFn: async () => apiClient.post("/api/session", {
            action: "create",
            allowGuestLending: settings.allowGuestLending
        }),
        onSuccess: () => {
            mutate("/api/session");
            queryClient.invalidateQueries({ queryKey: ["deck"] });
        }
    });

    const joinSession = useMutation({
        mutationFn: async (codeToJoin: string) => apiClient.post("/api/session", { action: "join", code: codeToJoin }),
        onSuccess: () => {
            const { basePath } = getRuntimeConfig();
            mutate("/api/session");
            queryClient.invalidateQueries({ queryKey: ["deck"] });
            router.replace(`${basePath}/`);
        },
    });

    const leaveSession = useMutation({
        mutationFn: async () => apiClient.delete("/api/session"),
        onSuccess: () => {
            const { basePath } = getRuntimeConfig();
            if (sessionStatus?.isGuest) {
                // Guests are logged out when leaving
                apiClient.post("/api/auth/logout").then(() => {
                    window.location.href = `${basePath}/login`;
                });
                return;
            }
            mutate("/api/session");
            if (activeCode) {
                mutate(["/api/session/matches", activeCode], []);
                mutate(["/api/session/members", activeCode], []);
            }
            queryClient.invalidateQueries({ queryKey: ["deck"] });
        }
    });

    const handleCreateSession = () => {
        toast.promise(createSession.mutateAsync(), {
            loading: "Creating session...",
            success: "Session created",
            error: (err) => {
                return {
                    message: "Failed to create session",
                    description: getErrorMessage(err)
                }
            },
        });
    };

    const handleJoinSession = (code: string) => {
        toast.promise(joinSession.mutateAsync(code), {
            loading: "Joining session...",
            success: "Connected!",
            error: (err) => {
                return {
                    message: "Invalid code",
                    description: getErrorMessage(err)
                }
            },
        });
    };

    const handleLeaveSession = () => {
        toast.promise(leaveSession.mutateAsync(), {
            loading: "Leaving session...",
            success: "Left session",
            error: (err) => {
                return {
                    message: "Failed to leave session",
                    description: getErrorMessage(err)
                }
            },
        });
    };


    // -- 4. AUTO-JOIN LOGIC --
    useEffect(() => {
        const joinParam = searchParams.get("join");
        if (joinParam && isSuccess && !activeCode) {
            setIsOpen(true);
            handleJoinSession(joinParam);
        }
    }, [searchParams, isSuccess, activeCode]);

    // -- 5. SHARE LOGIC --
    const handleShare = async () => {
        if (!activeCode) return;
        const { basePath } = getRuntimeConfig();
        const shareUrl = `${window.location.origin}${basePath}/?join=${activeCode}`;
        const shareData = {
            title: 'Swiparr session invite',
            text: `Join with code: ${activeCode}`,
            url: shareUrl
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.log("Share cancelled");
            }
        } else {
            await navigator.clipboard.writeText(shareUrl);
            toast.success("Link copied to clipboard");
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="absolute left-6">
                <Button variant="ghost" size="icon" className="text-foreground size-12">
                    <Users className="size-5.5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-md w-full px-4 gap-2">
                <SessionHeader
                    activeCode={activeCode}
                    members={members}
                    currentSettings={sessionStatus?.settings}
                />
                <div className="px-1">
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
                    <div>

                    </div>
                </div>
                <RandomMovieButton
                    items={matches}
                    className="absolute bottom-10 right-10"
                />
            </SheetContent>
        </Sheet>
    );
}

