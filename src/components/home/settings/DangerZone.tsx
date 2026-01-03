"use client";

import { Trash2, LogOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "./SettingsSection";
import { useSettingsStore } from "@/lib/settings";

interface DangerZoneProps {
    onClearData: () => void;
    onLogout: () => void;
}

export function DangerZone({ onClearData, onLogout }: DangerZoneProps) {
    const resetSettings = useSettingsStore((state) => state.resetSettings);

    return (
        <SettingsSection title="Danger Zone">
            <div className="space-y-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                        <div className="text-sm font-medium">Reset settings</div>
                        <div className="text-xs text-muted-foreground">Restore default preferences</div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-22 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={resetSettings}
                    >
                        <RotateCcw className="mr-2 size-4" /> Reset
                    </Button>
                </div>

                <div className="flex items-center justify-between border-t border-destructive/10 pt-4 gap-2">
                    <div className="space-y-0.5">
                        <div className="text-sm font-medium">Clear data</div>
                        <div className="text-xs text-muted-foreground">Reset likes and sessions</div>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-22"
                        onClick={onClearData}
                    >
                        <Trash2 className="mr-2 size-4" /> Clear
                    </Button>
                </div>

                <div className="flex items-center justify-between border-t border-destructive/10 pt-4 gap-2">
                    <div className="space-y-0.5">
                        <div className="text-sm font-medium">Log out</div>
                        <div className="text-xs text-muted-foreground">End your current session</div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onLogout}
                        className="w-22 border-destructive/20 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    >
                        <LogOut className="mr-2 size-4" /> Exit
                    </Button>
                </div>
            </div>
        </SettingsSection>
    );
}
