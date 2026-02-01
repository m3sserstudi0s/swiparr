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
import { Shield, Library, Check, Loader2, ChevronDown, ChevronRight, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner"
import { useRuntimeConfig } from "@/lib/runtime-config";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { 
  useAdminStatus, 
  useAdminConfig, 
  useMediaLibraries, 
  useAdminLibraries, 
  useUpdateAdminConfig, 
  useUpdateAdminLibraries, 
  useClaimAdmin,
} from "@/hooks/api";
import { MediaLibrary } from "@/types/media";

export function AdminSettings() {
    const { capabilities } = useRuntimeConfig();
    const [includedLibraries, setIncludedLibraries] = useState<string[]>([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [needsRefresh, setNeedsRefresh] = useState(false);

    const { data: adminStatus } = useAdminStatus();
    const { data: config, isLoading: isLoadingConfig } = useAdminConfig();
    const { data: availableLibraries = [], isLoading: isLoadingLibs } = useMediaLibraries();
    const { data: adminLibraries } = useAdminLibraries();

    const updateConfigMutation = useUpdateAdminConfig();
    const updateLibrariesMutation = useUpdateAdminLibraries();
    const claimMutation = useClaimAdmin();

    useEffect(() => {
        if (adminLibraries) {
            setIncludedLibraries(adminLibraries);
        }
    }, [adminLibraries]);

    const handleClaimAdmin = () => {
        toast.promise(claimMutation.mutateAsync(), {
            loading: "Claiming admin role...",
            success: "You are now the admin",
            error: (err) => ({
                message: "Failed to claim admin role",
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
            loading: "Updating libraries...",
            success: () => {
                setNeedsRefresh(true);
                return "Libraries updated successfully";
            },
            error: (err) => ({
                message: "Failed to update libraries",
                description: getErrorMessage(err)
            })
        });
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    if (adminStatus?.hasAdmin && !adminStatus.isAdmin) {
        return null;
    }

    return (
        <SettingsSection title="Admin">
            {!adminStatus?.hasAdmin ? (
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
                        <Shield className="size-5 text-warning shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <div className="text-sm font-medium">No admin appointed</div>
                            <div className="text-xs text-muted-foreground">
                                Claim the admin role to manage global application settings.
                                Only one user can be admin.
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
                        {claimMutation.isPending ? "Claiming..." : "Claim admin"}
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="space-y-6">
                        <div className="grid grid-flow-col items-center justify-between gap-2">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                    <div className="text-sm font-medium">Static Filters</div>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="size-4 p-0 hover:bg-transparent">
                                                <Info className="size-3.5 text-muted-foreground cursor-help" />
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Static Filter Values</DialogTitle>
                                                <DialogDescription className="pt-2">
                                                    Instead of fetching years, genres, and ratings from your Jellyfin server,
                                                    Swiparr will use a predefined list of values.
                                                    <br /><br />
                                                    This is <strong>only</strong>, and highly recommended for large libraries (3000+ items)
                                                    to significantly speed up the filter sheet loading.
                                                    <br /><br />
                                                </DialogDescription>
                                            </DialogHeader>
                                            <DialogFooter className="sm:justify-start">
                                                <DialogClose asChild>
                                                    <Button type="button" variant="secondary">
                                                        Okay
                                                    </Button>
                                                </DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                                <div className="text-xs text-muted-foreground text-pretty">Speed up filtering for extremely large libraries</div>
                            </div>
                            <Switch
                                checked={config?.useStaticFilterValues || false}
                                onCheckedChange={(checked) => {
                                  updateConfigMutation.mutate({ useStaticFilterValues: checked }, {
                                    onSuccess: () => setNeedsRefresh(true)
                                  });
                                }}
                                disabled={isLoadingConfig || updateConfigMutation.isPending}
                            />
                        </div>

                        {capabilities.hasLibraries && (
                            <Collapsible
                                open={isExpanded}
                                onOpenChange={setIsExpanded}
                                className="space-y-3"
                            >
                                <CollapsibleTrigger asChild>
                                    <button className="flex items-center justify-between w-full group">
                                        <div className="flex items-center gap-2 text-sm font-medium">
                                            <Library className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                            Libraries
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
                                            Select which libraries to include
                                        </p>
                                        {!isLoadingLibs && (
                                            <div className="flex items-center space-x-2 ml-auto">
                                                <Label htmlFor="all-libraries" className="text-sm font-medium">
                                                    All
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
                                                    No movie libraries found
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
                                        Save
                                    </Button>
                                </CollapsibleContent>
                            </Collapsible>
                        )}

                        {needsRefresh && (
                            <div className="animate-in zoom-in-95 duration-300">
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="w-full"
                                    onClick={handleRefresh}
                                >
                                    <RefreshCw className="size-4" />
                                    Reload to apply
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </SettingsSection>
    );
}
