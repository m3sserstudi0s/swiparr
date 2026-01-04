import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserAvatarList } from "./UserAvatarList";
import { Button } from "../ui/button";
import { Settings } from "lucide-react";
import { useState } from "react";
import { SessionSettingsSheet } from "./SessionSettingsSheet";
import axios from "axios";
import { useSWRConfig } from "swr";
import { toast } from "sonner";

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
    if (JSON.stringify(settings) === JSON.stringify(currentSettings)) return;

    try {
      await axios.patch("/api/session", { settings });
      mutate("/api/session");
      toast.success("Session settings updated");
    } catch (err) {
      toast.error("Failed to update settings");
    }
  };

  return (
    <>
      <SheetHeader className="px-0 pb-0 pt-3.5">
        <SheetTitle className="flex items-center mr-10 h-10">
          <Button
            variant="outline"
            size={"icon"}
            className="rounded-sm"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="size-5" />
          </Button>
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
