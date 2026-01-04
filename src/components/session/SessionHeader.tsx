import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserAvatarList } from "./UserAvatarList";
import { Button } from "../ui/button";
import { Settings } from "lucide-react";

interface SessionHeaderProps {
  activeCode?: string;
  members?: any[];
}

export function SessionHeader({ activeCode, members }: SessionHeaderProps) {
  return (
    <SheetHeader className="px-0 pb-0 pt-3.5">
      <SheetTitle className="flex items-center mr-10 h-10">
            <Button variant='outline' size={'icon'} className="rounded-sm">
              <Settings className="size-5"/>
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
  );
}
