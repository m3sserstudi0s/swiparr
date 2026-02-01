"use client";

import { useState, useEffect } from "react";
import { SettingsSection } from "./SettingsSection";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Globe, Tv, Check, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage, cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner"
import {
    useUserSettings,
    useUpdateUserSettings,
    useWatchProviders
} from "@/hooks/api";
import { WatchProvider } from "@/types/media";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { OptimizedImage } from "@/components/ui/optimized-image";

const REGIONS = [
    { code: "SE", name: "Sweden" },
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "IT", name: "Italy" },
    { code: "ES", name: "Spain" },
    { code: "CA", name: "Canada" },
    { code: "AU", name: "Australia" },
    { code: "CH", name: "Switzerland" },
];

export function StreamingSettings() {
    const { data: settings, isLoading: isLoadingSettings } = useUserSettings();
    const updateSettingsMutation = useUpdateUserSettings();

    const [region, setRegion] = useState("SE");
    const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);

    const { data: watchProvidersData, isLoading: isLoadingProviders } = useWatchProviders(region, null, true);
    const availableProviders = watchProvidersData?.providers || [];

    useEffect(() => {
        if (settings && availableProviders.length > 0 && !hasInitialized) {
            setRegion(settings.watchRegion || "SE");
            if ((settings as any).isNew) {
                setSelectedProviders(availableProviders.map(p => p.Id));
            } else {
                setSelectedProviders(settings.watchProviders || []);
            }
            setHasInitialized(true);
        }
    }, [settings, availableProviders, hasInitialized]);

    const toggleProvider = (id: string) => {
        setSelectedProviders(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelectedProviders(availableProviders.map(p => p.Id));
    };

    const deselectAll = () => {
        setSelectedProviders([]);
    };

    const saveSettings = async () => {
        if (selectedProviders.length === 0) {
            toast.error("At least one streaming service must be selected");
            return;
        }

        toast.promise(updateSettingsMutation.mutateAsync({
            watchRegion: region,
            watchProviders: selectedProviders,
        }), {
            loading: "Updating streaming settings...",
            success: "Settings updated successfully",
            error: (err) => ({
                message: "Failed to update settings",
                description: getErrorMessage(err)
            })
        });
    };

    if (isLoadingSettings) {
        return (
            <SettingsSection title="Streaming">
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            </SettingsSection>
        );
    }

    return (
        <SettingsSection title="Streaming">
            <div className="space-y-6">
                <div className="flex flex-col items-end gap-4">
                    <div className="w-full space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <Globe className="size-4 text-muted-foreground" />
                            <div className="text-sm font-medium">Region</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            Provider availability depends on region
                        </div>
                    </div>

                    <Select value={region} onValueChange={setRegion}>
                        <SelectTrigger className="w-40 h-9">
                            <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                            {REGIONS.map((r) => (
                                <SelectItem key={r.code} value={r.code}>
                                    {r.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Collapsible
                    open={isExpanded}
                    onOpenChange={setIsExpanded}
                    className="space-y-3"
                >
                    <CollapsibleTrigger asChild>
                        <button className="flex items-center justify-between w-full group">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Tv className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                Streaming Services
                            </div>
                            {isExpanded ? (
                                <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="size-4 text-muted-foreground" />
                            )}
                        </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">
                                Select which services you have access to
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={selectAll}
                                    className="text-[10px] font-medium text-primary hover:underline whitespace-nowrap"
                                >
                                    Select all
                                </button>
                                <button
                                    onClick={deselectAll}
                                    className="text-[10px] font-medium text-muted-foreground hover:underline"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {isLoadingProviders ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 max-h-75 overflow-y-auto pr-1">
                                {availableProviders.length === 0 ? (
                                    <div className="col-span-2 text-xs text-center py-4 text-muted-foreground border rounded-md border-dashed">
                                        No providers found for this region
                                    </div>
                                ) : (
                                    availableProviders.map((p: WatchProvider) => {
                                        const isSelected = selectedProviders.includes(p.Id);
                                        return (
                                            <button
                                                key={p.Id}
                                                onClick={() => toggleProvider(p.Id)}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 rounded-md border text-sm transition-all",
                                                    isSelected
                                                        ? "bg-primary/5 border-primary text-primary font-medium"
                                                        : "bg-background hover:bg-muted/50 border-input text-muted-foreground"
                                                )}
                                            >
                                                <div className="relative size-6 shrink-0 rounded overflow-hidden shadow-xs">
                                                    <OptimizedImage
                                                        src={`https://image.tmdb.org/t/p/w92${p.LogoPath}`}
                                                        alt={p.Name}
                                                        className="object-cover"
                                                        unoptimized
                                                        width={24}
                                                        height={24}
                                                    />
                                                </div>
                                                <span className="truncate text-[11px]">{p.Name}</span>
                                                {isSelected && <Check className="ml-auto size-3 shrink-0" />}
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
                            onClick={saveSettings}
                            disabled={updateSettingsMutation.isPending || isLoadingProviders}
                        >
                            {updateSettingsMutation.isPending && <Spinner />}
                            Save
                        </Button>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </SettingsSection>
    );
}
