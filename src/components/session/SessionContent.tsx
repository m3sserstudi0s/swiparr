"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Users, LogOut, Plus, Share2, UserPlus } from "lucide-react";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { MovieListItem } from "../movie/MovieListItem";
import { cn } from "@/lib/utils";
import { JellyfinItem } from "@/types/swiparr";
import { MovieDetailView } from "../movie/MovieDetailView";

export default function SessionContent() {
    const [inputCode, setInputCode] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();

    // -- 1. CHECK CURRENT STATUS --
    const { data: sessionStatus, isSuccess } = useQuery({
        queryKey: ["sessionStatus"],
        queryFn: async () => {
            const res = await axios.get<{ code: string | null }>("/api/session");
            return res.data;
        }
    });
    const activeCode = sessionStatus?.code;

    // -- 2. HANDLE MATCHES --
    const { data: matches } = useQuery<JellyfinItem[]>({
        queryKey: ["matches"],
        queryFn: async () => {
            const res = await axios.get<JellyfinItem[]>("/api/session/matches");
            return res.data;
        },
        enabled: !!activeCode,
        refetchInterval: 5000
    });

    // -- 3. MUTATIONS --
    const createSession = useMutation({
        mutationFn: async () => axios.post("/api/session", { action: "create" }),
        onSuccess: (res) => {
            queryClient.setQueryData(["sessionStatus"], { code: res.data.code });
            toast("Session created", { description: "Waiting for friends..." });
        }
    });

    const joinSession = useMutation({
        mutationFn: async (codeToJoin: string) => axios.post("/api/session", { action: "join", code: codeToJoin }),
        onSuccess: (res, variables) => {
            queryClient.setQueryData(["sessionStatus"], { code: variables });
            queryClient.invalidateQueries({ queryKey: ["deck"] });
            toast.success("Connected!", { description: `You are in session ${variables}` });
            router.replace("/");
        },
        onError: () => {
            toast.error("Invalid Code", { description: "Could not find that session." });
        }
    });

    const leaveSession = useMutation({
        mutationFn: async () => axios.delete("/api/session"),
        onSuccess: () => {
            queryClient.setQueryData(["sessionStatus"], { code: null });
            queryClient.setQueryData(["matches"], []);
            toast("Left session");
        }
    });

    // -- 4. AUTO-JOIN LOGIC --
    useEffect(() => {
        const joinParam = searchParams.get("join");
        if (joinParam && isSuccess && !activeCode) {
            setIsOpen(true);
            joinSession.mutate(joinParam);
        }
    }, [searchParams, isSuccess, activeCode]);

    // -- 5. SHARE LOGIC --
    const handleShare = async () => {
        if (!activeCode) return;
        const shareUrl = `${window.location.origin}/?join=${activeCode}`;
        const shareData = {
            title: 'Swiparr ession invite',
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
            <SheetTrigger asChild className="z-1">
                <Button variant="ghost" size="icon" className={cn(activeCode ? "text-primary" : "text-muted-foreground", "ml-4")}>
                    <Users className="w-6 h-6" />
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="z-101 sm:max-w-md w-full px-4">
                <SheetHeader>
                    <SheetTitle className="mb-4 flex items-center gap-2">
                        {activeCode ? (
                            <>
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-muted-foreground opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-muted-foreground"></span>
                                </span>
                                Session
                            </>
                        ) : "Session"}
                    </SheetTitle>
                </SheetHeader>
                <div className="space-y-6 px-1 mt-4">
                    <div className="w-full p-6 rounded-xl bg-muted/50 border border-border flex flex-col min-h-40 justify-between">
                        <div className="h-6 flex items-center justify-center mb-2">
                            {!activeCode ? (
                                <span className="text-sm text-muted-foreground">Enter code or create session</span>
                            ) : (
                                <span className="text-xs uppercase tracking-widest text-muted-foreground">Session Active</span>
                            )}
                        </div>
                        <div className="flex items-center justify-center mb-4 h-12">
                            {!activeCode ? (
                                <Input
                                    placeholder="Code"
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                                    className="bg-background border-input font-mono tracking-widest text-center uppercase h-10 w-full"
                                    maxLength={4}
                                />
                            ) : (
                                <div className="text-4xl font-black font-mono tracking-[0.2em] text-foreground">
                                    {activeCode}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            {!activeCode ? (
                                <>
                                    <Button
                                        onClick={() => joinSession.mutate(inputCode)}
                                        className="flex-1 h-10"
                                        variant="default"
                                        disabled={inputCode.length !== 4}
                                    >
                                        <UserPlus className="w-4 h-4 mr-2" />
                                        Join
                                    </Button>
                                    <Button
                                        onClick={() => createSession.mutate()}
                                        variant="outline"
                                        className="flex-1 h-10"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        onClick={handleShare}
                                        className="flex-1 h-10"
                                        variant="default"
                                    >
                                        <Share2 className="w-4 h-4 mr-2" />
                                        Share
                                    </Button>
                                    <Button
                                        onClick={() => leaveSession.mutate()}
                                        variant="outline"
                                        className="flex-1 h-10"
                                    >
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Leave
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="mt-4">
                        <h3 className="font-bold mb-3 flex items-center justify-between text-muted-foreground uppercase tracking-wider text-xs">
                            Matches Found
                            {(matches?.length ?? 0) > 0 && <Badge variant="secondary">{matches?.length}</Badge>}
                        </h3>
                        <ScrollArea className="h-[53vh] pr-4 -mr-4">
                            {!activeCode ? (
                                <div className="text-center text-muted-foreground text-sm py-8">
                                    Join a session to find matches.
                                </div>
                            ) : (
                                <>
                                    {matches?.map((movie: JellyfinItem) => (
                                        <MovieListItem
                                            key={movie.Id}
                                            movie={{ ...movie, isMatch: true } as any}
                                            onClick={() => setSelectedId(movie.Id)}
                                            variant="condensed"
                                        />
                                    ))}
                                    {matches?.length === 0 && (
                                        <div className="text-center text-muted-foreground text-sm py-8">
                                            No matches found yet.
                                        </div>
                                    )}
                                </>
                            )}
                        </ScrollArea>
                    </div>
                </div>
                <MovieDetailView
                    movieId={selectedId}
                    onClose={() => setSelectedId(null)}
                />
            </SheetContent>
        </Sheet>
    );
}
