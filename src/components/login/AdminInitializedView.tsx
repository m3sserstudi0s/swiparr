import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldCheck, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface AdminInitializedViewProps {
  onContinue: () => void;
}

export function AdminInitializedView({ onContinue }: AdminInitializedViewProps) {
  const t = useTranslations('AdminInit');
  const tUI = useTranslations('UI');

  return (
    <div className="flex flex-col space-y-4 h-full">
      <Alert className="bg-primary/10 border-primary/20">
        <ShieldCheck className="size-4 text-primary" />
        <AlertTitle className="text-primary font-bold">{t('title')}</AlertTitle>
        <AlertDescription className="text-xs text-primary/80">
          {t('description')}
        </AlertDescription>
      </Alert>
      <div className="flex-1 flex items-end pb-4">
        <Button onClick={onContinue} className="w-full group">
          {tUI('continueBtn')}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </Button>
      </div>
    </div>
  );
}
