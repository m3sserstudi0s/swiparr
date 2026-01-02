"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Users } from "lucide-react";
import axios from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import useSWR, { useSWRConfig } from "swr";
import { useUpdates } from "@/lib/use-updates";
import { useMovieDetail } from "../movie/MovieDetailProvider";
import { RandomMovieButton } from "../movie/RandomMovieButton";

import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { JellyfinItem } from "@/types/swiparr";
import { SessionHeader } from "./SessionHeader";
import { SessionCodeSection } from "./SessionCodeSection";
import { MatchesList } from "./MatchesList";

import { useHotkeys } from "react-hotkeys-hook";

export default function SessionContent() {
    const [inputCode, setInputCode] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    useHotkeys("m, c", () => setIsOpen(prev => !prev), []);
    const { openMovie } = useMovieDetail();
    const queryClient = useQueryClient();
    const { mutate } = useSWRConfig();
    const searchParams = useSearchParams();
    const router = useRouter();

    // -- 1. CHECK CURRENT STATUS --
    const { data: sessionStatus, isLoading: isSessionLoading } = useSWR(
        "/api/session",
        url => axios.get(url).then(res => res.data)
    );
    const isSuccess = !isSessionLoading && !!sessionStatus;
    const activeCode = sessionStatus?.code;

    // -- 1.6 SUBSCRIBE TO EVENTS --
    useUpdates(activeCode);

    // -- 1.5 FETCH MEMBERS (Using SWR) --
    const { data: members } = useSWR<any[]>(
        activeCode ? ["/api/session/members", activeCode] : null,
        ([url]: [string]) => axios.get(url).then(res => res.data)
    );

    // -- 2. HANDLE MATCHES (Using SWR) --
    const { data: matches } = useSWR<JellyfinItem[]>(
        activeCode ? ["/api/session/matches", activeCode] : null,
        ([url]: [string]) => axios.get(url).then(res => res.data)
    );

    // -- 3. MUTATIONS --
    const createSession = useMutation({
        mutationFn: async () => axios.post("/api/session", { action: "create" }),
        onSuccess: () => {
            mutate("/api/session");
            queryClient.invalidateQueries({ queryKey: ["deck"] });
        }
    });

    const joinSession = useMutation({
        mutationFn: async (codeToJoin: string) => axios.post("/api/session", { action: "join", code: codeToJoin }),
        onSuccess: () => {
            mutate("/api/session");
            queryClient.invalidateQueries({ queryKey: ["deck"] });
            router.replace("/");
        },
    });

    const leaveSession = useMutation({
        mutationFn: async () => axios.delete("/api/session"),
        onSuccess: () => {
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
            error: "Failed to create session",
        });
    };

    const handleJoinSession = (code: string) => {
        toast.promise(joinSession.mutateAsync(code), {
            loading: "Joining session...",
            success: "Connected!",
            error: "Invalid Code",
        });
    };

    const handleLeaveSession = () => {
        toast.promise(leaveSession.mutateAsync(), {
            loading: "Leaving session...",
            success: "Left session",
            error: "Failed to leave session",
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
        const shareUrl = `${window.location.origin}/?join=${activeCode}`;
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
            <SheetTrigger asChild className="absolute">
                <Button variant="ghost" size="icon" className="text-foreground">
                    <Users className="size-5" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="sm:max-w-md w-full px-4">
                <SessionHeader activeCode={activeCode} members={members} />
                <div className="space-y-6 px-1 mt-4">
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

