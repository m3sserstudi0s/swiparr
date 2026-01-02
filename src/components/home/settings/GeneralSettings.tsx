"use client";

import { Sun, Moon, Bookmark, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { useTheme } from "next-themes";
import { useSettings } from "@/lib/settings";
import { SettingsSection } from "./SettingsSection";


export function GeneralSettings() {
    const { setTheme, theme } = useTheme();
    const { settings, updateSettings } = useSettings();

    return (
        <SettingsSection title="General">
            <div className="grid grid-flow-col items-center justify-between gap-2">
                <div className="space-y-0.5">
                    <div className="text-sm font-medium">Theme</div>
                    <div className="text-xs text-muted-foreground text-pretty">Switch between light and dark mode</div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="w-26"
                >
                    {theme === "light" ? (
                        <><Sun className="mr-2 size-4" /> Light</>
                    ) : (
                        <><Moon className="mr-2 size-4" /> Dark</>
                    )}
                </Button>
            </div>

            <div className="grid grid-flow-col items-center justify-between gap-2">
                <div className="space-y-0.5">
                    <div className="text-sm font-medium">Collection type</div>
                    <div className="text-xs text-muted-foreground text-pretty">Toggle between Watchlist and Favorites</div>
                </div>
                <Toggle
                    pressed={settings.useWatchlist}
                    onPressedChange={(pressed) => updateSettings({ useWatchlist: pressed })}
                    variant="outline"
                    size="sm"
                    className="w-26"
                >
                    {settings.useWatchlist ? <Bookmark/> : <Star/>}
                    {settings.useWatchlist ? "Watchlist" : "Favorites"}
                </Toggle>
            </div>
        </SettingsSection>
    );
}
