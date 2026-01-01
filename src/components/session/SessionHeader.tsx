import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { UserAvatarList } from "./UserAvatarList";

interface SessionHeaderProps {
  activeCode?: string;
  members?: any[];
}

export function SessionHeader({ activeCode, members }: SessionHeaderProps) {
  return (
    <SheetHeader>
      <SheetTitle className="mb-4 flex items-center gap-2 h-12">
        {activeCode ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-muted-foreground opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-muted-foreground"></span>
            </span>
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
