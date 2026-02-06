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
        bg-linear-to-b dark:from-neutral-100 dark:via-neutral-200 dark:to-neutral-400 from-white via-neutral-50 to-neutral-200
        ${className}
      `}
    >
      {children}
    </span>
  );
}
