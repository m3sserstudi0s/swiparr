"use client";

import { Trash2, LogOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsSection } from "./SettingsSection";
import { useSettingsStore } from "@/lib/settings";
import { useTranslations } from "next-intl";

interface DangerZoneProps {
    onClearData: () => void;
    onLogout: () => void;
}

export function DangerZone({ onClearData, onLogout }: DangerZoneProps) {
    const resetSettings = useSettingsStore((state) => state.resetSettings);
    const t = useTranslations('SettingsDanger');
    const tUI = useTranslations('UI');

    return (
        <SettingsSection title={t('title')}>
            <div className="space-y-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                        <div className="text-sm font-medium">{tUI('resetSettings')}</div>
                        <div className="text-xs text-muted-foreground">{t('resetDesc')}</div>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-22"
                        onClick={resetSettings}
                    >
                        <RotateCcw className="mr-2 size-4" /> {tUI('resetBtn')}
                    </Button>
                </div>

                <div className="flex items-center justify-between border-t border-destructive/10 pt-4 gap-2">
                    <div className="space-y-0.5">
                        <div className="text-sm font-medium">{tUI('clearData')}</div>
                        <div className="text-xs text-muted-foreground">{t('clearDesc')}</div>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        className="w-22"
                        onClick={onClearData}
                    >
                        <Trash2 className="mr-2 size-4" /> {tUI('clearBtn')}
                    </Button>
                </div>

                <div className="flex items-center justify-between border-t border-destructive/10 pt-4 gap-2">
                    <div className="space-y-0.5">
                        <div className="text-sm font-medium">{t('logoutTitle')}</div>
                        <div className="text-xs text-muted-foreground">{t('logoutDesc')}</div>
                    </div>
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={onLogout}
                        className="w-22"
                    >
                        <LogOut className="mr-2 size-4" /> {t('logoutBtn')}
                    </Button>
                </div>
            </div>
        </SettingsSection>
    );
}
