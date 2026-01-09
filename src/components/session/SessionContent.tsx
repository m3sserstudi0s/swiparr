"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Users } from "lucide-react";
import { useMovieDetail } from "../movie/MovieDetailProvider";
import { RandomMovieButton } from "../movie/RandomMovieButton";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
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

export default function SessionContent() {
    const [inputCode, setInputCode] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const { settings } = useSettings();

    useHotkeys("m, c", () => setIsOpen(prev => !prev), []);
    const { openMovie } = useMovieDetail();
    const searchParams = useSearchParams();
    const router = useRouter();

    const { data: sessionStatus, isLoading: isSessionLoading } = useSession();
    const activeCode = sessionStatus?.code || undefined;
    const isSuccess = !isSessionLoading && !!sessionStatus;

    const { data: members } = useMembers();
    const { data: matches } = useMatches();

    const createSession = useCreateSession();
    const joinSession = useJoinSession();
    const leaveSession = useLeaveSession();

    const handleCreateSession = () => {
        toast.promise(createSession.mutateAsync({ allowGuestLending: settings.allowGuestLending }), {
            loading: "Creating session...",
            success: "Session created",
            error: (err) => ({
                message: "Failed to create session",
                description: getErrorMessage(err)
            }),
        });
    };

    const handleJoinSession = (code: string) => {
        toast.promise(joinSession.mutateAsync(code), {
            loading: "Joining session...",
            success: "Connected!",
            error: (err) => ({
                message: "Invalid code",
                description: getErrorMessage(err)
            }),
        });
    };

    const handleLeaveSession = async () => {
        try {
            await toast.promise(leaveSession.mutateAsync(), {
                loading: "Leaving session...",
                success: "Left session",
                error: (err) => ({
                    message: "Failed to leave session",
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
        if (joinParam && isSuccess && !activeCode) {
            setIsOpen(true);
            handleJoinSession(joinParam);
        }
    }, [searchParams, isSuccess, activeCode]);

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
                <Button variant="ghost" size="icon" className="text-foreground size-10">
                    <Users className="size-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-md w-full px-4 gap-2">
                <SessionHeader
                    activeCode={activeCode}
                    members={members}
                    currentSettings={sessionStatus?.settings || undefined}
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
                </div>
                <RandomMovieButton
                    items={matches}
                    className="absolute bottom-10 right-10"
                />
            </SheetContent>
        </Sheet>
    );
}
