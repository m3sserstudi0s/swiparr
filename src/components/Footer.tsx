import { GITHUB_URL, MESSER_STUDIOS_URL, SUPPORT_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface FooterProps {
    className?: string;
}

export function Footer({ className }: FooterProps) {
    return (
        <div className={cn("text-center text-[10px] text-muted-foreground uppercase tracking-widest", className)}>
            <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                Support
            </a>
            <span className="mx-2">•</span>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                Open Source
            </a>
            <span className="mx-2">•</span>
            <a href={MESSER_STUDIOS_URL} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">
                Messer Studios
            </a>
        </div>
    );
}
