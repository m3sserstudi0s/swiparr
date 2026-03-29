import { useState, useEffect } from "react";
import { Crown, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmoothAvatar } from "@/components/ui/smooth-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSession } from "@/hooks/api";
import { SessionMember } from "@/types";

interface MembersListProps {
  activeCode?: string;
  members?: SessionMember[];
  onKick?: (userId: string) => void;
}

export function MembersList({ activeCode, members, onKick }: MembersListProps) {
  const { data: session } = useSession();
  const isViewerHost = !!session?.hostUserId && session.hostUserId === session.userId;
  const [pendingKick, setPendingKick] = useState<SessionMember | null>(null);
  const [skipConfirm, setSkipConfirm] = useState(false);

  useEffect(() => {
    setSkipConfirm(localStorage.getItem("kick-skip-confirm") === "true");
  }, []);

  const handleKickClick = (member: SessionMember) => {
    if (skipConfirm) {
      onKick?.(member.externalUserId);
    } else {
      setPendingKick(member);
    }
  };

  if (!activeCode || !members?.length) return null;

  return (
    <>
      <div>
        <h3 className="font-bold mb-1 flex items-center justify-between text-muted-foreground uppercase tracking-wider text-xs">
          Party
          <Badge variant="secondary">{members.length}</Badge>
        </h3>
        <div className="divide-y divide-border">
          {members.map((member) => {
            const isHost = member.externalUserId === session?.hostUserId;
            return (
              <div key={member.externalUserId} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2.5">
                  <SmoothAvatar
                    userId={member.externalUserId}
                    userName={member.externalUserName}
                    hasImage={!!member.hasCustomProfilePicture}
                    updatedAt={member.profileUpdatedAt}
                    className="size-7"
                    fallbackClassName="text-xs font-semibold bg-muted text-foreground"
                  />
                  <span className="text-sm font-medium">{member.externalUserName}</span>
                  {isHost && <Crown className="size-3.5 fill-accent text-accent ml-0.5" />}
                </div>
                {isViewerHost && !isHost && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleKickClick(member)}
                  >
                    <UserX className="size-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <AlertDialog open={!!pendingKick} onOpenChange={(open) => !open && setPendingKick(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kick {pendingKick?.externalUserName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will be removed from the session and sent back to the login screen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingKick) onKick?.(pendingKick.externalUserId);
                setPendingKick(null);
              }}
            >
              Kick
            </AlertDialogAction>
          </AlertDialogFooter>
          <div className="flex justify-center">
            <button
              className="text-muted-foreground text-xs hover:text-foreground transition-colors py-1"
              onClick={() => {
                localStorage.setItem("kick-skip-confirm", "true");
                setSkipConfirm(true);
                if (pendingKick) onKick?.(pendingKick.externalUserId);
                setPendingKick(null);
              }}
            >
              Kick & don't ask again
            </button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
