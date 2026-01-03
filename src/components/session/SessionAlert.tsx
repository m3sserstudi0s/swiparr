import { AlertCircleIcon, Info, X } from "lucide-react"
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert"
import { useSettings } from "@/lib/settings"
import useSWR from "swr"
import axios from "axios"
import { Button } from "@/components/ui/button"

export function SessionAlert() {
    const { settings, updateSettings } = useSettings();
    const { data: sessionStatus } = useSWR("/api/session", (url) => axios.get(url).then(res => res.data));

    const isGuest = sessionStatus?.isGuest || false;

    if (isGuest) {
        return (
            <Alert className="py-1.75 px-4 h-18">
                <AlertCircleIcon className="size-4 text-primary" />
                <AlertTitle>Guest Session</AlertTitle>
                <AlertDescription className="text-xs text-pretty">
                    You are currently joined as a guest. Some features are unavailable.
                </AlertDescription>
            </Alert>
        )
    }

    if (!settings.hasDismissedGuestLendingAlert && !settings.allowGuestLending && !isGuest) {
        return (
            <Alert className="relative py-1.75 px-3 h-18">
                <Info className="size-4 text-primary" />
                <AlertTitle>Guest Lending</AlertTitle>
                <AlertDescription className="text-xs">
                    Allow others to join your session without a Jellyfin account by enabling Guest Lending in Settings
                </AlertDescription>
                <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 size-6 hover:bg-primary/10"
                    onClick={() => updateSettings({ hasDismissedGuestLendingAlert: true })}
                >
                    <X className="size-4" />
                </Button>
            </Alert>
        )
    }

    return <div className="h-18"/>;
}
