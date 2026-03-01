"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { SettingsSection } from "./SettingsSection";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Tv, Check, Loader2, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage, cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner"
import {
    useUserSettings,
    useUpdateUserSettings,
    useWatchProviders,
    useRegions
} from "@/hooks/api";
import { WatchProvider, MediaRegion } from "@/types/media";
import { CountryFlag } from "@/components/ui/country-flag";
import {
    Combobox,
    ComboboxInput,

    ComboboxContent,
    ComboboxEmpty,
    ComboboxList,
    ComboboxItem,
    ComboboxTrigger,
} from "@/components/ui/combobox"
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getRuntimeConfig } from "@/lib/runtime-config";
import {
    InputGroup,
    InputGroupAddon,
    InputGroupButton,
    InputGroupInput,
} from "@/components/ui/input-group";
import { useTranslations } from "next-intl";

export function StreamingSettings() {
    const { data: settings, isLoading: isLoadingSettings } = useUserSettings();
    const { data: regions = [] } = useRegions();
    const updateSettingsMutation = useUpdateUserSettings();
    const { tmdbDefaultRegion } = getRuntimeConfig();
    const t = useTranslations('SettingsStreaming');
    const tUI = useTranslations('UI');

    const [selectedRegion, setSelectedRegion] = useState<MediaRegion | null>(null);
    const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [hasInitialized, setHasInitialized] = useState(false);
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const [providersScrollParent, setProvidersScrollParent] = useState<HTMLElement | null>(null);
    const [providerSearch, setProviderSearch] = useState<string>("");

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setContainer(document.querySelector('[data-slot="sheet-content"]') as HTMLElement);
    }, []);

    const { data: watchProvidersData, isLoading: isLoadingProviders } = useWatchProviders(selectedRegion?.Id || tmdbDefaultRegion, null, true);
    const availableProviders = useMemo(() => watchProvidersData?.providers || [], [watchProvidersData]);
    const availableProviderIds = useMemo(
        () => availableProviders.map((p: WatchProvider) => p.Id),
        [availableProviders]
    );
    const filteredProviders = useMemo(() => {
        const query = providerSearch.trim().toLowerCase();
        if (!query) return availableProviders;
        return availableProviders.filter((provider) =>
            provider.Name?.toLowerCase().includes(query)
        );
    }, [availableProviders, providerSearch]);
    const gap = 12;
    const gridComponents = useMemo(() => ({
        List: ({ children, style, ...props }: React.ComponentProps<"div">) => (
            <div
                {...props}
                style={{
                    ...style,
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: `${gap}px`,
                }}
            >
                {children}
            </div>
        ),
        Item: ({ children, ...props }: React.ComponentProps<"div">) => (
            <div {...props} className="w-full">
                {children}
            </div>
        ),
    }), [gap]);

    const handleProvidersViewport = useCallback((node: HTMLDivElement | null) => {
        setProvidersScrollParent(node);
    }, []);

    useEffect(() => {
        if (settings && regions.length > 0 && !hasInitialized) {
            const regionCode = settings.watchRegion || tmdbDefaultRegion;
            const region = regions.find(r => r.Id === regionCode) || regions.find(r => r.Id === tmdbDefaultRegion) || regions[0];
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSelectedRegion(region);

            if (settings.isNew) {
                setSelectedProviders(availableProviderIds);
            } else {
                setSelectedProviders(settings.watchProviders || []);
            }
            setHasInitialized(true);
        }
    }, [settings, regions, availableProviders, availableProviderIds, hasInitialized]);

    useEffect(() => {
        if (selectedRegion && availableProviders.length > 0 && hasInitialized) {
            const availableSet = new Set(availableProviderIds);
            setSelectedProviders(prev => prev.filter(pId => availableSet.has(pId)));
        }
    }, [selectedRegion, availableProviders.length, availableProviderIds, hasInitialized]);

    const toggleProvider = (id: string) => {
        setSelectedProviders(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        setSelectedProviders(availableProviderIds);
    };

    const deselectAll = () => {
        setSelectedProviders([]);
    };

    const clearSearch = () => {
        setProviderSearch("");
    };

    const saveSettings = async (region: MediaRegion | null = selectedRegion) => {
        if (selectedProviders.length === 0) {
            toast.error(t('atLeastOneService'));
            return;
        }

        toast.promise(updateSettingsMutation.mutateAsync({
            watchRegion: region?.Id || tmdbDefaultRegion,
            watchProviders: selectedProviders,
        }), {
            loading: t('updatingSettings'),
            success: t('settingsUpdated'),
            error: (err) => ({
                message: tUI('failedUpdateSettings'),
                description: getErrorMessage(err)
            })
        });
    };

    if (isLoadingSettings) {
        return (
            <SettingsSection title={t('title')}>
                <div className="flex items-center justify-center py-4">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
            </SettingsSection>
        );
    }

    const handleSaveSelectedRegion = (region: MediaRegion | null) => {
        console.log("Selected region:", region);
        setSelectedRegion(region);
        saveSettings(region);
    }

    return (
        <SettingsSection title={t('title')}>
            <div className="space-y-6">
                <div className="flex flex-col items-end gap-4">
                    <div className="w-full space-y-0.5">
                        <div className="flex items-center gap-1.5">
                            <div className="text-sm font-medium">{t('regionTitle')}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {t('regionDesc')}
                        </div>
                    </div>

                    <Combobox
                        value={selectedRegion}
                        onValueChange={handleSaveSelectedRegion}
                        items={regions}
                        itemToStringValue={(r: MediaRegion) => r?.Name || ""}
                    >
                        <ComboboxTrigger className="grid grid-cols-[1fr_auto] h-9 w-44 items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors hover:bg-muted/20 focus:outline-none focus:ring-1 focus:ring-ring">
                            <div className="flex items-center gap-2 truncate">
                                {selectedRegion ? (
                                    <>
                                        <div className="w-4 h-3 overflow-hidden rounded-[2px] shrink-0 border border-border/50">
                                            <CountryFlag countryCode={selectedRegion.Id} />
                                        </div>
                                        <span className="truncate text-left">{selectedRegion?.Name || t('selectRegion')}</span>
                                    </>
                                ) :
                                    <Skeleton className="w-30 h-7" />
                                }
                            </div>
                        </ComboboxTrigger>
                        <ComboboxContent container={container} className="min-w-44 z-1000">
                            <ComboboxInput placeholder={t('searchRegion')} showTrigger={false} autoFocus />
                            <ComboboxEmpty>{t('noRegion')}</ComboboxEmpty>
                            <ComboboxList>
                                {(r: MediaRegion) => (
                                    <ComboboxItem key={r.Id} value={r} className="cursor-pointer gap-2">
                                        <div className="w-4 h-3 overflow-hidden rounded-[1px] shrink-0 border border-border/50">
                                            <CountryFlag countryCode={r.Id} />
                                        </div>
                                        {r.Name}
                                    </ComboboxItem>
                                )}
                            </ComboboxList>
                        </ComboboxContent>

                    </Combobox>

                </div>

                <Collapsible
                    open={isExpanded}
                    onOpenChange={setIsExpanded}
                    className="space-y-3"
                >
                    <CollapsibleTrigger asChild>
                        <button className="flex items-center justify-between w-full group cursor-pointer">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <Tv className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                {tUI('streamingServices')}
                            </div>
                            {isExpanded ? (
                                <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="size-4 text-muted-foreground" />
                            )}
                        </button>
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-4 pt-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                                {t('servicesDesc')}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={selectAll}
                                    className="text-xs font-medium text-primary hover:underline whitespace-nowrap cursor-pointer"
                                >
                                    {tUI('selectAll')}
                                </button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={deselectAll}
                                    className="h-8 max-[400px]:flex-1"
                                >
                                    {tUI('clearBtn')}
                                </Button>
                            </div>
                        </div>

                        <InputGroup className="bg-muted/30 border-input">
                            <InputGroupAddon align="inline-start">
                                <Search className="size-4" />
                            </InputGroupAddon>
                            <InputGroupInput
                                placeholder={tUI('searchServices')}
                                value={providerSearch}
                                onChange={(event) => setProviderSearch(event.target.value)}
                            />
                            <InputGroupAddon align="inline-end">
                                {providerSearch ? (
                                    <InputGroupButton
                                        variant="ghost"
                                        size="icon-xs"
                                        aria-label={tUI('clearSearch')}
                                        onClick={clearSearch}
                                    >
                                        <X className="size-4" />
                                    </InputGroupButton>
                                ) : null}
                            </InputGroupAddon>
                        </InputGroup>

                        {isLoadingProviders ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="size-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <ScrollArea className="flex-1 overflow-y-auto h-75" viewportRef={handleProvidersViewport}>
                                {availableProviders.length === 0 ? (
                                    <div className="text-xs text-center py-4 text-muted-foreground border rounded-md border-dashed">
                                        {t('noServicesRegion')}
                                    </div>
                                ) : filteredProviders.length === 0 ? (
                                    <div className="text-xs text-center py-4 text-muted-foreground border rounded-md border-dashed">
                                        {tUI('noServicesMatch')}
                                    </div>
                                ) : (
                                    <VirtuosoGrid
                                        data={filteredProviders}
                                        components={gridComponents}
                                        style={{ height: "100%" }}
                                        className="mr-3 my-2"
                                        customScrollParent={providersScrollParent || undefined}
                                        itemContent={(_, provider) => {
                                            const isSelected = selectedProviders.includes(provider.Id);
                                            return (
                                                <button
                                                    onClick={() => toggleProvider(provider.Id)}
                                                    className={cn(
                                                        "flex items-center w-full gap-2 p-2 rounded-md border text-sm transition-all",
                                                        isSelected
                                                            ? "bg-primary/5 border-primary text-primary font-medium"
                                                            : "bg-background hover:bg-muted/50 border-input text-muted-foreground"
                                                    )}
                                                >
                                                    <div className="relative size-6 shrink-0 rounded overflow-hidden shadow-xs">
                                                        <OptimizedImage
                                                            src={`https://image.tmdb.org/t/p/w92${provider.LogoPath}`}
                                                            alt={provider.Name}
                                                            className="object-cover"
                                                            unoptimized
                                                            width={24}
                                                            height={24}
                                                        />
                                                    </div>
                                                    <span className="truncate text-[11px]">{provider.Name}</span>
                                                    {isSelected && <Check className="ml-auto size-3 shrink-0" />}
                                                </button>
                                            );
                                        }}
                                    />
                                )}
                            </ScrollArea>
                        )}

                        <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={() => saveSettings()}
                            disabled={updateSettingsMutation.isPending || isLoadingProviders}
                        >
                            {updateSettingsMutation.isPending && <Spinner />}
                            {tUI('saveBtn')}
                        </Button>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </SettingsSection>
    );
}
