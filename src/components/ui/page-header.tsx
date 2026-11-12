/**
 * Messer UI page header: the mono meta eyebrow, the h1 in the human voice, an optional
 * description, and right-aligned actions. One shape for every surface.
 *
 * Deliberately no `cn` import — see status-badge.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={`flex flex-wrap items-end justify-between gap-4 ${className ?? ""}`.trim()}>
      <div className="grid gap-1">
        {eyebrow ? <span className="m-label">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
