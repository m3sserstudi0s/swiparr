"use client";

import { useState, useEffect } from "react";
import { SettingsSection } from "./SettingsSection";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Shield, Library, Check, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner"
import { useRuntimeConfig } from "@/lib/runtime-config";
import { useSession, useAdminStatus, useMediaLibraries, useAdminLibraries, useUpdateAdminLibraries, useClaimAdmin } from "@/hooks/api";
import { MediaLibrary } from "@/types/media";
import { useTranslations } from "next-intl";

export function AdminSettings() {
    const { data: sessionStatus } = useSession();
    const runtimeConfig = useRuntimeConfig();
    const capabilities = sessionStatus?.capabilities || runtimeConfig.capabilities;
    const t = useTranslations('SettingsAdmin');
    const tUI = useTranslations('UI');

    const [includedLibraries, setIncludedLibraries] = useState<string[]>([]);
    const [baseUrl, setBaseUrl] = useState<string>('');
    const [isExpanded, setIsExpanded] = useState(false);

    const { data: adminStatus } = useAdminStatus();
    const { data: availableLibraries = [], isLoading: isLoadingLibs } = useMediaLibraries();
    const { data: adminLibraries } = useAdminLibraries();

    const updateLibrariesMutation = useUpdateAdminLibraries();
    const claimMutation = useClaimAdmin();

    useEffect(() => {
        if (adminLibraries) {
            setIncludedLibraries(adminLibraries);
        }
    }, [adminLibraries]);

    const handleClaimAdmin = () => {
        toast.promise(claimMutation.mutateAsync(), {
            loading: t('claimingAdmin'),
            success: t('claimedAdmin'),
            error: (err) => ({
                message: t('failedClaimAdmin'),
                description: getErrorMessage(err)
            })
        });
    };

    const toggleLibrary = (id: string) => {
        if (id === "all") {
            setIncludedLibraries([]);
            return;
        }
        setIncludedLibraries(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const saveLibraries = async () => {
        toast.promise(updateLibrariesMutation.mutateAsync(includedLibraries), {
            loading: t('updatingLibraries'),
            success: () => {
                return t('librariesUpdated');
            },
            error: (err) => ({
                message: t('failedUpdateLibraries'),
                description: getErrorMessage(err)
            })
        });
    };

    if (sessionStatus?.isGuest || (adminStatus?.hasAdmin && !adminStatus.isAdmin)) {
        return null;
    }

    return (
        <SettingsSection title={tUI('admin')}>
            {!adminStatus?.hasAdmin ? (
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
                        <Shield className="size-5 text-warning shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <div className="text-sm font-medium">{t('noAdminTitle')}</div>
                            <div className="text-xs text-muted-foreground">
                                {t('noAdminDesc1')}
                                <br />
                                {t('noAdminDesc2')}
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={handleClaimAdmin}
                        disabled={claimMutation.isPending}
                    >
                        {claimMutation.isPending ? t('claimingBtn') : t('claimBtn')}
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="space-y-6">
                        {capabilities.hasLibraries && (
                            <Collapsible
                                open={isExpanded}
                                onOpenChange={setIsExpanded}
                                className="space-y-3"
                            >
                                <CollapsibleTrigger asChild>
                                    <button className="flex items-center justify-between w-full group cursor-pointer">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Library className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            {t('librariesTitle')}
                                        </div>
                                        {isExpanded ? (
                                            <ChevronDown className="size-4 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="size-4 text-muted-foreground" />
                                        )}
                                    </button>
                                </CollapsibleTrigger>

                                <CollapsibleContent className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex flex-row justify-between items-center gap-2">
                                        <p className="text-xs text-muted-foreground">
                                            {t('librariesDesc')}
                                        </p>
                                        {!isLoadingLibs && (
                                            <div className="flex items-center space-x-2 ml-auto">
                                                <Label htmlFor="all-libraries" className="text-sm font-medium">
                                                    {t('allLbl')}
                                                </Label>
                                                <Switch
                                                    id="all-libraries"
                                                    checked={includedLibraries.length === 0}
                                                    disabled={includedLibraries.length === 0}
                                                    onCheckedChange={() => toggleLibrary("all")}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    {isLoadingLibs ? (
                                        <div className="flex items-center justify-center py-4">
                                            <Loader2 className="size-6 animate-spin text-muted-foreground" />
                                        </div>
                                    ) : (
                                        <div className="grid gap-2">
                                            {availableLibraries.length === 0 ? (
                                                <div className="text-xs text-center py-4 text-muted-foreground border rounded-md border-dashed">
                                                    {t('noMoviesFound')}
                                                </div>
                                            ) : (
                                                availableLibraries.map((lib: MediaLibrary) => {
                                                    const isIncluded = includedLibraries.includes(lib.Id);
                                                    return (
                                                        <button
                                                            key={lib.Id}
                                                            onClick={() => toggleLibrary(lib.Id)}
                                                            className={cn(
                                                                "flex items-center justify-between p-3 rounded-md border text-sm transition-colors",
                                                                isIncluded
                                                                    ? "bg-primary/5 border-primary text-primary font-medium"
                                                                    : "bg-background hover:bg-muted/50 border-input text-muted-foreground"
                                                            )}
                                                        >
                                                            <div className="flex flex-col items-start gap-0.5 text-left">
                                                                <span>{lib.Name}</span>
                                                                <span className="text-[10px] uppercase tracking-wider opacity-60">
                                                                    {lib.CollectionType}
                                                                </span>
                                                            </div>
                                                            {isIncluded && <Check className="size-4" />}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    )}

                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="w-full"
                                        onClick={saveLibraries}
                                        disabled={updateLibrariesMutation.isPending || isLoadingLibs}
                                    >
                                        {updateLibrariesMutation.isPending && <Spinner />}
                                        {tUI('saveBtn')}
                                    </Button>
                                </CollapsibleContent>
                            </Collapsible>
                        )}
                    </div>
                </div>
            )}
        </SettingsSection>
    );
}
