"use client";

import { BookOpenText, Code, Info, Loader2, AlertCircle, CircleCheck, ExternalLink, FileText, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { GITHUB_URL } from "@/lib/constants";
import { SettingsSection } from "./SettingsSection";
import { toast } from "sonner";
import { useVersion } from "@/hooks/api";

interface AboutSettingsProps {
    onShowUserGuide: () => void;
}

export function AboutSettings({ onShowUserGuide }: AboutSettingsProps) {
    const { version: currentVersion } = useRuntimeConfig();
    const { data: versionData, error: versionError, isFetching: isCheckingVersion, refetch } = useVersion();

    const latestVersion = versionData?.version;
    const isLatest = latestVersion ? currentVersion >= latestVersion : true;

    const handleCheckUpdate = async () => {
        toast.promise(refetch(), {
            loading: "Checking for updates...",
            success: (res) => {
                const latest = res.data?.version;
                if (!latest) return "Could not check version";
                return currentVersion >= latest 
                    ? "You are on the latest version" 
                    : `New version ${latest} available`;
            },
            error: "Failed to check for updates",
        });
    };

    return (
        <SettingsSection title="About">
            <div className="space-y-3">
                <Button
                    variant="outline"
                    className="w-full justify-between font-normal h-12 px-3 py-7"
                    onClick={onShowUserGuide}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-md text-primary">
                            <BookOpenText className="size-4" />
                        </div>
                        <span>User guide</span>
                    </div>
                    <FileText className="size-4 text-muted-foreground" />
                </Button>

                <Button
                    variant="outline"
                    className="w-full justify-between font-normal h-12 px-3 py-7"
                    asChild
                >
                    <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-md">
                                <Code className="size-4" />
                            </div>
                            <span>Source code</span>
                        </div>
                        <ExternalLink className="size-4 text-muted-foreground" />
                    </a>
                </Button>

                <Button
                    variant="outline"
                    className="w-full justify-between font-normal h-12 px-3 py-7"
                    onClick={handleCheckUpdate}
                    disabled={isCheckingVersion}
                >
                    <div className="flex flex-row items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-md">
                                <Info className="size-4" />
                            </div>
                            <div className="flex flex-col items-start">
                                <span>Version</span>
                                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">{currentVersion}</span>
                            </div>
                        </div>
                        {isCheckingVersion ? (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        ) : versionError || versionData?.error ? (
                            <Badge variant="destructive" className="h-6">
                                <AlertCircle className="size-3" />
                                Offline
                            </Badge>
                        ) : isLatest ? (
                            <Badge variant="outline" className="h-6">
                                <CircleCheck className="size-3" />
                                Latest
                            </Badge>
                        ) : (
                            <Badge variant="secondary" className="h-6">
                                <ArrowUp className="size-3" />
                                Update
                            </Badge>
                        )}
                    </div>
                </Button>

                {!isLatest && latestVersion && (
                    <div className="text-xs text-muted-foreground">
                        New version <span className="font-mono font-bold">{latestVersion}</span> is available.
                    </div>
                )}
            </div>
        </SettingsSection>
    );
}
