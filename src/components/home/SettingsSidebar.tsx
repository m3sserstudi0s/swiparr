"use client";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "../ui/button";
import { useState, Suspense, lazy } from "react";
import { UserGuide } from "./UserGuide";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";

// Lazy load settings sections for code splitting
const GeneralSettings = lazy(() => import("./settings/GeneralSettings").then(m => ({ default: m.GeneralSettings })));
const AboutSettings = lazy(() => import("./settings/AboutSettings").then(m => ({ default: m.AboutSettings })));
const DangerZone = lazy(() => import("./settings/DangerZone").then(m => ({ default: m.DangerZone })));

export function SettingsSidebar() {
    const router = useRouter();
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [showUserGuide, setShowUserGuide] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [open, setOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await axios.post("/api/auth/logout");
            router.push("/login");
        } catch (error) {
            console.error("Logout failed:", error);
            toast.error("Logout failed");
        }
    };

    const handleClearData = async () => {
        setIsClearing(true);
        const promise = axios.post("/api/user/clear");

        toast.promise(promise, {
            loading: "Clearing all data...",
            success: () => {
                setShowClearDialog(false);
                router.refresh();
                setIsClearing(false);
                return "All data cleared successfully";
            },
            error: () => {
                setIsClearing(false);
                return "Failed to clear data";
            },
        });
    };

    return (
        <>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button className="absolute right-0" variant="ghost" size="icon">
                        <Menu className="size-6" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col p-0 overflow-hidden">
                    <SheetHeader className="p-6 pb-0">
                        <div className="flex items-center gap-2">
                            <SheetTitle>Settings</SheetTitle>
                        </div>
                    </SheetHeader>

                    <ScrollArea className="flex-1 px-6 h-[calc(100vh-80px)]">
                        <div className="space-y-8 py-8 pb-12">
                            <Suspense fallback={<SettingsSkeleton />}>
                                <GeneralSettings />
                                <AboutSettings onShowUserGuide={() => {
                                    setShowUserGuide(true);
                                    setOpen(false);
                                }} />
                                <DangerZone 
                                    onClearData={() => setShowClearDialog(true)} 
                                    onLogout={handleLogout} 
                                />
                            </Suspense>
                        </div>
                    </ScrollArea>
                </SheetContent>
            </Sheet>

            <UserGuide open={showUserGuide} onOpenChange={setShowUserGuide} />

            <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete your
                            likes and any sessions you have created.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowClearDialog(false)}
                            disabled={isClearing}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleClearData}
                            disabled={isClearing}
                        >
                            {isClearing ? "Clearing..." : "Clear data"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function SettingsSkeleton() {
    return (
        <div className="space-y-8">
            {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-4">
                    <Skeleton className="h-4 w-24" />
                    <div className="space-y-3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
            ))}
        </div>
    );
}
