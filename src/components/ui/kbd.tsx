import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const kbdVariants = cva(
  "inline-flex items-center justify-center rounded-none border border-border bg-surface-2 px-1.5 font-mono text-[10px] font-medium text-muted-foreground",
  {
    variants: {
      variant: {
        default: "",
        outline: "bg-transparent shadow-none",
      },
      size: {
        default: "h-5 min-w-[20px]",
        sm: "h-4 min-w-[16px] px-1 text-[9px]",
        lg: "h-6 min-w-[24px] px-2 text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface KbdProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof kbdVariants> {}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <kbd
        ref={ref}
        className={cn(kbdVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)
Kbd.displayName = "Kbd"

function KbdGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-row items-center gap-1", className)}
      {...props}
    />
  )
}

export { Kbd, KbdGroup, kbdVariants }
