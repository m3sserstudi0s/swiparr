import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserAvatarList } from "./UserAvatarList";

interface SessionHeaderProps {
  activeCode?: string;
  members?: any[];
}

export function SessionHeader({ activeCode, members }: SessionHeaderProps) {
  return (
    <SheetHeader>
      <SheetTitle className="mb-4 flex items-center gap-2 h-10">
        {activeCode ? (
          <>
            Session
            {members && members.length > 0 && (
              <div className="py-2">
                <UserAvatarList
                  size="md"
                  users={members.map((m: any) => ({
                    userId: m.jellyfinUserId,
                    userName: m.jellyfinUserName,
                  }))}
                />
              </div>
            )}
          </>
        ) : (
          "Session"
        )}
      </SheetTitle>
    </SheetHeader>
  );
}
