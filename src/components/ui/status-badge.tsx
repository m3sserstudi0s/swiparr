import { Check, Circle, Hourglass, Warning, X } from "@phosphor-icons/react/dist/ssr";
import type { Icon as PhosphorIcon } from "@phosphor-icons/react";

import { Badge } from "@/components/ui/badge";

const STATUS = {
  success: { Icon: Check, tone: "text-success" },
  warning: { Icon: Warning, tone: "text-warning" },
  danger: { Icon: X, tone: "text-destructive" },
  neutral: { Icon: Circle, tone: "text-foreground" },
  // A suspended-but-not-failed state: a stack paused by hand, a job parked.
  paused: { Icon: Hourglass, tone: "text-foreground" },
} as const satisfies Record<string, { Icon: PhosphorIcon; tone: string }>;

export type Status = keyof typeof STATUS;

/**
 * Messer UI rule 8: status is always icon + label, and colour only reinforces.
 * Never render a bare coloured dot as the only signal.
 *
 * Deliberately no `cn` import: apps in this family are split between Radix and Base UI and do not
 * share a utilities module, so the class list is composed directly.
 */
export function StatusBadge({
  status,
  children,
  className,
  ...props
}: React.ComponentProps<typeof Badge> & { status: Status }) {
  const { Icon, tone } = STATUS[status];
  return (
    <Badge variant="outline" className={`${tone} ${className ?? ""}`.trim()} {...props}>
      <Icon aria-hidden="true" />
      {children}
    </Badge>
  );
}
