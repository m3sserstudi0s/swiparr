import { ReactNode } from "react";

interface GradientTextProps {
  children: ReactNode;
  className?: string;
}

export default function GradientText({
  children,
  className = "",
}: GradientTextProps) {
  return (
    <span
      className={`
        inline-block font-bold
        text-transparent bg-clip-text
        bg-linear-to-b from-foreground/50 via-foreground/80 to-foreground
        ${className}
      `}
    >
      {children}
    </span>
  );
}
