import { Loader2Icon, LoaderIcon } from "lucide-react"

import { cn } from "@/lib/utils"

import { useTranslations } from "next-intl"

function Spinner({ className, label, ...props }: React.ComponentProps<"svg"> & { label?: string }) {
  const t = useTranslations('UI');
  return (
    <LoaderIcon
      role="status"
      aria-label={label || t('loading')}
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

export { Spinner }
