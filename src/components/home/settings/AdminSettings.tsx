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
import { Shield, ShieldAlert, ShieldCheck, Library, Check, Loader2, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/utils";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton";

interface JellyfinLibrary {

    Name: string;
    Id: string;
    CollectionType?: string;
}

export function AdminSettings() {
    const [status, setStatus] = useState<{ hasAdmin: boolean; isAdmin: boolean } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isClaiming, setIsClaiming] = useState(false);
    const [includedLibraries, setIncludedLibraries] = useState<string[]>([]);
    const [isSavingLibs, setIsSavingLibs] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [needsRefresh, setNeedsRefresh] = useState(false);
    const router = useRouter();

    const { data: availableLibraries = [], isLoading: isLoadingLibs } = useQuery({
        queryKey: ["jellyfin-libraries"],
        queryFn: async () => {
            const res = await apiClient.get("/api/jellyfin/libraries");
            return res.data;
        },
        enabled: !!status?.isAdmin,
        staleTime: 1000 * 60 * 60, // 1 hour
    });

    const { data: adminLibraries } = useQuery({
        queryKey: ["admin-libraries"],
        queryFn: async () => {
            const res = await apiClient.get("/api/admin/libraries");
            return res.data;
        },
        enabled: !!status?.isAdmin,
    });

    useEffect(() => {
        if (adminLibraries) {
            setIncludedLibraries(adminLibraries);
        }
    }, [adminLibraries]);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const statusRes = await apiClient.get("/api/admin/status");
                setStatus(statusRes.data);
            } catch (err) {
                console.error("Failed to fetch admin status", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStatus();
    }, []);

    const handleClaim = async () => {
        setIsClaiming(true);
        try {
            await apiClient.post("/api/admin/claim");
            toast.success("You are now the admin");
            setStatus({ hasAdmin: true, isAdmin: true });
            router.refresh();
        } catch (err) {
            toast.error("Failed to claim admin role", {
                description: getErrorMessage(err)
            });
            console.error(err);
        } finally {
            setIsClaiming(false);
        }
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
        setIsSavingLibs(true);
        try {
            await apiClient.patch("/api/admin/libraries", includedLibraries);
            toast.success("Libraries updated successfully");
            setNeedsRefresh(true);
        } catch (err) {
            toast.error("Failed to update libraries", {
                description: getErrorMessage(err)
            });
            console.error(err);
        } finally {
            setIsSavingLibs(false);
        }
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    if (isLoading) {
        return (
            <SettingsSection title="Admin">
                <Skeleton className="h-5 w-full rounded-sm" />
            </SettingsSection>
        );
    }

    // Only show if no admin exists or if current user IS admin

    if (status?.hasAdmin && !status.isAdmin) {
        return null;
    }

    return (
        <SettingsSection title="Admin">
            {!status?.hasAdmin ? (
                <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
                        <ShieldAlert className="size-5 text-warning shrink-0 mt-0.5" />
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
                        onClick={handleClaim}
                        disabled={isClaiming}
                    >
                        {isClaiming ? "Claiming..." : "Claim admin"}
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="space-y-3">
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
                                            availableLibraries.map((lib: JellyfinLibrary) => {
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
                                    disabled={isSavingLibs || isLoadingLibs}
                                >
                                    {isSavingLibs && <Spinner />}
                                    Save
                                </Button>
                            </CollapsibleContent>
                        </Collapsible>

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
