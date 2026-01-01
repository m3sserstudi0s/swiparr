interface SettingsSectionProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function SettingsSection({ title, children, className }: SettingsSectionProps) {
    return (
        <section className={className}>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">
                {title}
            </h3>
            <div className="space-y-4">
                {children}
            </div>
        </section>
    );
}
