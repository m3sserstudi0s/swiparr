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
import { apiClient } from "@/lib/api-client";
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
const AdminSettings = lazy(() => import("./settings/AdminSettings").then(m => ({ default: m.AdminSettings })));
const AboutSettings = lazy(() => import("./settings/AboutSettings").then(m => ({ default: m.AboutSettings })));
const DangerZone = lazy(() => import("./settings/DangerZone").then(m => ({ default: m.DangerZone })));

import { useHotkeys } from "react-hotkeys-hook";

export function SettingsSidebar() {
    const router = useRouter();
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [showUserGuide, setShowUserGuide] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [open, setOpen] = useState(false);

    useHotkeys("s, ,", () => setOpen(prev => !prev), []);

    const handleLogout = async () => {
        try {
            await apiClient.post("/api/auth/logout");
            router.push("/login");
        } catch (error) {
            console.error("Logout failed:", error);
            toast.error("Logout failed");
        }
    };

    const handleClearData = async () => {
        setIsClearing(true);
        const promise = apiClient.post("/api/user/clear");

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
                            <Suspense fallback={<SectionSkeleton title="General" />}>
                                <GeneralSettings />
                            </Suspense>
                            <Suspense fallback={<SectionSkeleton title="Admin" />}>
                                <AdminSettings />
                            </Suspense>
                            <Suspense fallback={null}>
                                <AboutSettings onShowUserGuide={() => {
                                    setShowUserGuide(true);
                                    setOpen(false);
                                }} />
                            </Suspense>
                            <Suspense fallback={null}>
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

function SectionSkeleton({ title }: { title: string }) {
    return (
        <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                {title}
            </h3>
            <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        </div>
    );
}

