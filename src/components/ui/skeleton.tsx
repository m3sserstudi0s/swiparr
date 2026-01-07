import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("shimmer shimmer-bg bg-accent rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
