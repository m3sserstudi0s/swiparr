import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface QuickConnectViewProps {
  qcCode: string;
  copied: boolean;
  onCopy: () => void;
  onCancel: () => void;
}

export function QuickConnectView({ qcCode, copied, onCopy, onCancel }: QuickConnectViewProps) {
  return (
    <div className="flex flex-col items-center space-y-6 py-4">
      <div className="relative group">
        <div className="flex flex-row text-3xl font-black tracking-[0.5em] text-primary bg-muted p-4 rounded-lg border border-primary/20">
          {qcCode}
          <Button
            variant="outline"
            size="icon"
            className="ml-2"
            onClick={onCopy}
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="h-4 w-4 " />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Go to <span className="text-foreground font-semibold">Settings → Quick Connect</span> on your logged-in device to authorize.
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="text-muted-foreground hover:text-foreground"
      >
        Cancel
      </Button>
    </div>
  );
}
