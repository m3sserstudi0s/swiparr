import { GITHUB_URL, MESSER_STUDIOS_URL, SUPPORT_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useTranslations } from 'next-intl';

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const t = useTranslations('Footer');
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center text-center text-[10px] text-muted-foreground uppercase tracking-widest",
        className
      )}
    >
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noreferrer"
        className="hover:text-primary transition-colors"
      >
        {t('support')}
      </a>

      <span className="mx-2">•</span>

      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
        className="hover:text-primary transition-colors"
      >
        {t('openSource')}
      </a>

      {/* Hide this bullet on small screens since Messer goes to a new line */}
      <span className="mx-2 hidden sm:inline">•</span>

      <a
        href={MESSER_STUDIOS_URL}
        target="_blank"
        rel="noreferrer"
        className="hover:text-primary transition-colors w-full sm:w-auto mt-3 sm:mt-0"
      >
        {t('studio')}
      </a>
    </div>
  );
}