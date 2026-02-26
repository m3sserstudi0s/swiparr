"use client"
import React from 'react'
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CHANGELOG } from "@/lib/changelog"
import { cn } from "@/lib/utils"

interface ChangelogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

const typeDot: Record<string, string> = {
    fix:         "bg-orange-400",
    feature:     "bg-emerald-400",
    improvement: "bg-blue-400",
}

const typeOrder: Record<string, number> = {
    improvement: 0,
    feature:     1,
    fix:         2,
}

const typeLabel: Record<string, string> = {
    fix:         "Fix",
    feature:     "New",
    improvement: "Improvement",
}

const typeText: Record<string, string> = {
    fix:         "text-orange-400",
    feature:     "text-emerald-400",
    improvement: "text-blue-400",
}

export function Changelog({ open, onOpenChange }: ChangelogProps) {
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <DrawerHeader className="border-b pb-4">
                    <DrawerTitle>Changelog</DrawerTitle>
                    <DrawerDescription>What&apos;s new in Swiparr</DrawerDescription>
                </DrawerHeader>
                <ScrollArea className="h-[55vh] px-6 py-5">
                    <div className="space-y-8 pb-8">
                        {CHANGELOG.map((entry, ei) => (
                            <div key={entry.version} className={cn("space-y-4", ei > 0 && "pt-2 border-t border-border/50")}>
                                <div className="flex items-baseline gap-2.5">
                                    <span className="font-mono font-semibold text-sm tracking-tight">{entry.version}</span>
                                    <span className="text-xs text-muted-foreground/60">{entry.date}</span>
                                </div>
                                <ul>
                                    {[...entry.changes].sort((a, b) => typeOrder[a.type] - typeOrder[b.type]).map((change, i) => (
                                        <li key={i} className={cn("flex items-start gap-3 pt-3", i === 0 ? "" : "border-t border-border/30")}>
                                            <div className="flex items-center gap-1.5 shrink-0 mt-[3px] w-[90px]">
                                                <div className={cn("size-1.5 rounded-full shrink-0", typeDot[change.type])} />
                                                <span className={cn("text-[10px] font-semibold uppercase tracking-wider", typeText[change.type])}>
                                                    {typeLabel[change.type]}
                                                </span>
                                            </div>
                                            <span className="text-sm text-muted-foreground leading-snug">{change.description}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </DrawerContent>
        </Drawer>
    )
}
