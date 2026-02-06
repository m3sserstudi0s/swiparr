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
        bg-linear-to-b from-foreground to-muted-foreground
        ${className}
      `}
    >
      {children}
    </span>
  );
}
