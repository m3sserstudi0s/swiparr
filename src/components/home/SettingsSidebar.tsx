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
import { getErrorMessage } from "@/lib/utils";
import { useRuntimeConfig } from "@/lib/runtime-config";
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

import { useHotkeys } from "react-hotkeys-hook";
import { AboutSettings } from "./settings/AboutSettings";
import { AccountSettings } from "./settings/AccountSettings";
import { AdminSettings } from "./settings/AdminSettings";
import { GeneralSettings } from "./settings/GeneralSettings";
import { DangerZone } from "./settings/DangerZone";

export function SettingsSidebar() {
    const router = useRouter();
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [showUserGuide, setShowUserGuide] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [open, setOpen] = useState(false);

    useHotkeys("s, ,", () => setOpen(prev => !prev), []);

    const { basePath } = useRuntimeConfig();
    const handleLogout = async () => {
        try {
            await apiClient.post("/api/auth/logout");
            router.push(`${basePath}/login`);
        } catch (error) {
            console.error("Logout failed:", error);
            toast.error("Logout failed", {
                description: getErrorMessage(error)
            });
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
            error: (err) => {
                setIsClearing(false);
                return { message: "Failed to clear data", description: getErrorMessage(err) };
            },
        });
    };

    return (
        <>
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button className="absolute right-6 size-10 hover:bg-muted/30!" variant="ghost" size="icon">
                        <Menu className="size-5.5" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="flex flex-col overflow-hidden">
                    <SheetHeader className="p-6 pb-0">
                        <div className="flex items-center gap-2">
                            <SheetTitle>Settings</SheetTitle>
                        </div>
                    </SheetHeader>

                    <ScrollArea className="flex-1 px-6 h-[calc(100svh-80px)]">
                        <div className="space-y-8 py-8 pb-12">
                            <AccountSettings />
                            <GeneralSettings />
                            <AdminSettings />
                            <AboutSettings onShowUserGuide={() => {
                                setShowUserGuide(true);
                                setOpen(false);
                            }} />
                            <DangerZone
                                onClearData={() => setShowClearDialog(true)}
                                onLogout={handleLogout}
                            />

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

