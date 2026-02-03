import { AlertCircleIcon, Info, X } from "lucide-react"
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert"
import { useSettings } from "@/lib/settings"
import { useSession } from "@/hooks/api"
import { useRuntimeConfig } from "@/lib/runtime-config"
import { Button } from "@/components/ui/button"

export function SessionAlert() {
    const runtimeConfig = useRuntimeConfig();
    const { settings, updateSettings } = useSettings();
    const { data: sessionStatus } = useSession();
    const capabilities = sessionStatus?.capabilities || runtimeConfig.capabilities;

    const isGuest = sessionStatus?.isGuest || false;

    if (isGuest) {
        return (
            <Alert className="py-1.75 px-3 h-17 gap-y-1! gap-x-2!">
                <AlertCircleIcon className="size-4 text-primary" />
                <AlertTitle>Guest Session</AlertTitle>
                <AlertDescription className="text-xs text-pretty">
                    You are currently joined as a guest. Some features are unavailable due to the account lending.
                </AlertDescription>
            </Alert>
        )
    }

    if (capabilities.hasAuth && !settings.hasDismissedGuestLendingAlert && !settings.allowGuestLending && !isGuest) {
        return (
            <Alert className="relative py-1.75 px-3 h-17 gap-y-1! gap-x-2!">
                <Info className="size-4 text-primary" />
                <AlertTitle>Guest Lending</AlertTitle>
                <AlertDescription className="text-xs">
                    Allow others to join your session without an account by enabling Guest Lending in Settings.
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

    return <div className="h-17"/>;
}
