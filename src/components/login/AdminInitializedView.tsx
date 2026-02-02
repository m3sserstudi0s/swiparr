import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, ArrowRight } from "lucide-react";

interface AdminInitializedViewProps {
  onContinue: () => void;
}

export function AdminInitializedView({ onContinue }: AdminInitializedViewProps) {
  return (
    <div className="flex flex-col space-y-4 h-full">
      <Alert className="bg-primary/10 border-primary/20">
        <ShieldCheck className="size-4 text-primary" />
        <AlertTitle className="text-primary font-bold">Admin Privileges</AlertTitle>
        <AlertDescription className="text-xs text-primary/80">
          You are the first user and have been set as the administrator.
        </AlertDescription>
      </Alert>
      <div className="flex-1 flex items-end pb-4">
        <Button onClick={onContinue} className="w-full group">
          Continue
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}
