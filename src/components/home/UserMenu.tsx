import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Menu, Moon, Sun, Trash2 } from "lucide-react"

import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "../ui/button";
import { useTheme } from "next-themes";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner";

export function UserMenu() {
    const router = useRouter();
    const [showClearDialog, setShowClearDialog] = useState(false);
    const [isClearing, setIsClearing] = useState(false);

    const { setTheme, theme } = useTheme()

    const handleLogout = async () => {
        try {
            await axios.post("/api/auth/logout");
            router.push("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const handleClearData = async () => {
        setIsClearing(true);
        try {
            await axios.post("/api/user/clear");
            toast.success("All data cleared successfully");
            setShowClearDialog(false);
            router.refresh();
        } catch (error) {
            console.error("Clear data failed:", error);
            toast.error("Failed to clear data");
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button className="absolute right-0" variant="ghost" size="icon">
                        <Menu className="size-6" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-fit z-101" align="start">
                    <DropdownMenuItem onClick={handleLogout} className="text-default">
                        <LogOut className="size-4" />
                        Log out
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="text-default">
                        <Sun className="size-4 scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                        <Moon className="size-4 absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                        Theme
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                        onSelect={() => setShowClearDialog(true)}
                        className="text-default"
                    >
                        <Trash2 className="size-4" />
                        Clear data
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
                <DialogContent className="z-101">
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete your
                            likes, hidden items, and any sessions you have created.
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
    )
}

