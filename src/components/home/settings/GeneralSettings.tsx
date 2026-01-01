"use client";

import { Sun, Moon } from "lucide-react";
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
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <div className="text-sm font-medium">Theme</div>
                    <div className="text-xs text-muted-foreground text-pretty">Switch between light and dark mode</div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                    className="w-24"
                >
                    {theme === "light" ? (
                        <><Sun className="mr-2 size-4" /> Light</>
                    ) : (
                        <><Moon className="mr-2 size-4" /> Dark</>
                    )}
                </Button>
            </div>

            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <div className="text-sm font-medium">Collection type</div>
                    <div className="text-xs text-muted-foreground text-pretty">Toggle between Watchlist and Favorites</div>
                </div>
                <Toggle
                    pressed={settings.useWatchlist}
                    onPressedChange={(pressed) => updateSettings({ useWatchlist: pressed })}
                    variant="outline"
                    size="sm"
                    className="w-24 data-[state=on]:bg-primary/20 data-[state=on]:text-primary"
                >
                    {settings.useWatchlist ? "Watchlist" : "Favorites"}
                </Toggle>
            </div>
        </SettingsSection>
    );
}
