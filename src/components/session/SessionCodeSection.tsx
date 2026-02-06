import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Plus, Share2, LogOut, Info, X, Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SecureContextCopyFallback } from "../SecureContextCopyFallback";

interface SessionCodeSectionProps {

  activeCode?: string;
  inputCode: string;
  setInputCode: (code: string) => void;
  handleJoinSession: (code: string) => void;
  handleCreateSession: () => void;
  handleShare: () => void;
  handleLeaveSession: () => void;
  isJoining: boolean;
  isCreating: boolean;
  isLeaving: boolean;
}

export function SessionCodeSection({
  activeCode,
  inputCode,
  setInputCode,
  handleJoinSession,
  handleCreateSession,
  handleShare,
  handleLeaveSession,
  isJoining,
  isCreating,
  isLeaving,
}: SessionCodeSectionProps) {

  const [copied, setCopied] = useState(false);
  const [isFallbackOpen, setIsFallbackOpen] = useState(false);

  const copyToClipboard = async () => {
    if (activeCode) {
      if (!window.isSecureContext || !navigator.clipboard) {
        setIsFallbackOpen(true);
        return;
      }
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <SecureContextCopyFallback
        open={isFallbackOpen}
        onOpenChange={setIsFallbackOpen}
        title="Copy Session Code"
        value={activeCode || ""}
      />
      <div className="space-y-4">

      <div className="w-full p-6 rounded-xl bg-muted/50 border border-border flex flex-col justify-between h-44">
        <div className="h-6 flex items-center justify-center mb-2">
          {!activeCode ? (
            <span className="text-[11px] text-muted-foreground/50 uppercase tracking-widest font-semibold">
              Enter code or create session
            </span>
          ) : (
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Session code
            </span>
          )}
        </div>
        <div className="flex items-center justify-center mb-4 h-12">
          {!activeCode ? (
            <Input
              placeholder="Code"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              className="bg-background border-input font-mono tracking-widest text-center uppercase h-10 w-full"
              maxLength={4}
            />
          ) : (
            <div className="flex flex-row items-center justify-center">
              <div className="text-4xl font-black font-mono tracking-[0.2em] text-foreground">
                {activeCode}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="ml-2"
                onClick={copyToClipboard}
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check className="h-4 w-4 " />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          {!activeCode ? (
            <>
              <Button
                onClick={() => handleJoinSession(inputCode)}
                className="flex-1 h-10"
                variant="default"
                disabled={inputCode.length !== 4 || isJoining}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Join
              </Button>
              <Button
                onClick={handleCreateSession}
                variant="outline"
                className="flex-1 h-10"
                disabled={isCreating}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleShare} className="flex-1 h-10" variant="default">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button
                onClick={handleLeaveSession}
                variant="outline"
                className="flex-1 h-10"
                disabled={isLeaving}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}

