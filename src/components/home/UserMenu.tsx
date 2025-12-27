import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Menu, Moon, Sun } from "lucide-react"

import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "../ui/button";
import { useTheme } from "next-themes";

export function UserMenu() {
    const router = useRouter();

    const { setTheme, theme } = useTheme()

    const handleLogout = async () => {
        try {
            await axios.post("/api/auth/logout");
            router.push("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className="mr-5 z-101" asChild>
                <Button variant="ghost" size="icon">
                    <Menu className="w-5 h-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-fit z-101" align="start">
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-5 h-5" />
                    Log out
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                    <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
                    Theme
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
