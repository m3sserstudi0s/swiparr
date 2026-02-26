import { Info, UserPlus, X } from "lucide-react"
import {
    Item,
    ItemActions,
    ItemContent,
    ItemDescription,
    ItemMedia,
    ItemTitle,
} from "@/components/ui/item"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
            <Item variant="outline" size='sm'>
                <ItemMedia>
                    <UserPlus className="size-4" />
                </ItemMedia>
                <ItemContent>
                    <ItemTitle>Guest Session</ItemTitle>
                </ItemContent>
                <ItemActions>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Info className="size-4 cursor-pointer" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Guest Session</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You are currently joined as a guest. Some features are unavailable due to you lending the session host's account.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Okay</AlertDialogCancel>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </ItemActions>
            </Item>
        )
    }

    if (capabilities.hasAuth && !settings.hasDismissedGuestLendingAlert && !settings.allowGuestLending && !isGuest) {
        return (

            <Item variant="outline" size='sm'>
                <ItemContent>
                    <ItemTitle><strong>Tip:</strong> Guest Lending</ItemTitle>
                    <ItemDescription className="text-xs">
                        Allow others to join your session without an account by enabling Guest Lending in Settings.
                    </ItemDescription>
                </ItemContent>
                <ItemActions>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateSettings({ hasDismissedGuestLendingAlert: true })}>
                        <X className="size-4" />
                    </Button>
                </ItemActions>
            </Item>
        )
    }

    return null;
}
