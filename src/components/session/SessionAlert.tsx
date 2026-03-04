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
import { useTranslations } from "next-intl"

export function SessionAlert() {
    const t = useTranslations('Session');
    const tGeneral = useTranslations('SettingsGeneral');
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
                    <ItemTitle>{t('guestSessionTitle')}</ItemTitle>
                </ItemContent>
                <ItemActions>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Info className="size-4 cursor-pointer" />
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>{t('guestSessionTitle')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                    {t('guestSessionDesc')}
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>{tGeneral('okayBtn')}</AlertDialogCancel>
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
                    <ItemTitle>{t.rich('guestLendingTipTitle', { bold: (chunks) => <strong>{chunks}</strong> })}</ItemTitle>
                    <ItemDescription className="text-xs">
                        {t('guestLendingTipDesc')}
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
