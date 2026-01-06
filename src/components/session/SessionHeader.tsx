import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserAvatarList } from "./UserAvatarList";
import { Button } from "../ui/button";
import { Settings } from "lucide-react";
import { useState } from "react";
import { SessionSettingsSheet } from "./SessionSettingsSheet";
import { useSWRConfig } from "swr";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/utils";


interface SessionHeaderProps {
  activeCode?: string;
  members?: any[];
  currentSettings?: any;
}

export function SessionHeader({ activeCode, members, currentSettings }: SessionHeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { mutate } = useSWRConfig();

  const handleSaveSettings = async (settings: any) => {
    // Only save if it's different from current to avoid unnecessary patches
    const current = currentSettings || {};
    const hasChanged =
      settings.matchStrategy !== (current.matchStrategy || "atLeastTwo") ||
      (settings.maxLeftSwipes || 100) !== (current.maxLeftSwipes || 100) ||
      (settings.maxRightSwipes || 100) !== (current.maxRightSwipes || 100) ||
      (settings.maxMatches || 10) !== (current.maxMatches || 10);

    if (!hasChanged) return;

    try {
      await apiClient.patch("/api/session", { settings });
      mutate("/api/session");
      toast.success("Session settings updated");
    } catch (err) {
      toast.error("Failed to update settings", {
        description: getErrorMessage(err)
      });
    }
  };


  return (
    <>
      <SheetHeader className="px-0 pb-0 pt-3.5">
        <SheetTitle className="flex items-center mr-10 h-10">
          {activeCode ? <Button
            variant="outline"
            size={"icon"}
            className="rounded-sm"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="size-5" />
          </Button>
            : <p className="ml-2">Session</p>
          }
          {activeCode && members && members.length > 0 && (
            <div className="mx-auto">
              <UserAvatarList
                size="md"
                users={members.map((m: any) => ({
                  userId: m.jellyfinUserId,
                  userName: m.jellyfinUserName,
                }))}
              />
            </div>
          )}
        </SheetTitle>
      </SheetHeader>

      <SessionSettingsSheet
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        currentSettings={currentSettings}
        onSave={handleSaveSettings}
      />
    </>
  );
}
