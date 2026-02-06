import { GITHUB_URL, MESSER_STUDIOS_URL, SUPPORT_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
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
        Support
      </a>

      <span className="mx-2">•</span>

      <a
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
        className="hover:text-primary transition-colors"
      >
        Open Source
      </a>

      {/* Hide this bullet on small screens since Messer goes to a new line */}
      <span className="mx-2 hidden sm:inline">•</span>

      <a
        href={MESSER_STUDIOS_URL}
        target="_blank"
        rel="noreferrer"
        className="hover:text-primary transition-colors w-full sm:w-auto mt-3 sm:mt-0"
      >
        Messer Studios
      </a>
    </div>
  );
}