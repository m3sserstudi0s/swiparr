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
import { Kbd } from "@/components/ui/kbd"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Heart,
    X,
    RotateCcw,
    Info,
    Users,
    Keyboard,
    Filter,
    Trophy,
    ShieldCheck
} from 'lucide-react'
import { motion } from 'framer-motion'

interface UserGuideProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function UserGuide({ open, onOpenChange }: UserGuideProps) {
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <DrawerHeader className="border-b">
                    <DrawerTitle>User Guide</DrawerTitle>
                    <DrawerDescription>Learn how to use Swiparr</DrawerDescription>
                </DrawerHeader>
                <div className="px-6 py-4">
                    <Tabs defaultValue="basics" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 h-11">
                            <TabsTrigger value="basics">Basics</TabsTrigger>
                            <TabsTrigger value="sessions">Sessions</TabsTrigger>
                            <TabsTrigger value="guest">Guest</TabsTrigger>
                            <TabsTrigger value="shortcuts">Hotkeys</TabsTrigger>
                        </TabsList>
                        <ScrollArea className="h-[50vh] pr-4">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.1 }}
                            >
                                <TabsContent value="basics" className="mt-8 space-y-6 pb-8">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Heart className="size-4" />
                                                <span className="font-semibold text-sm tracking-wide">Swipe Right</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium">Add to your likes. A match is created if other participants also swipe right.</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                                <X className="size-4" />
                                                <span className="font-semibold text-sm tracking-wide">Swipe Left</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium">Discard the current title and move to the next.</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                                <RotateCcw className="size-4" />
                                                <span className="font-semibold text-sm tracking-wide">Rewind</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium">Revert the last swipe action.</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Info className="size-4" />
                                                <span className="font-semibold text-sm tracking-wide">Details</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium">Expand the card to view synopsis, trailers, and cast info.</p>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-4">
                                        <Filter className="size-4 text-primary mt-1 shrink-0" />
                                        <p className="text-sm text-muted-foreground">
                                            Filter by Genre, Year, or Rating. Toggle Jellyfin Watchlist/Favorites sync in settings.
                                        </p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="sessions" className="mt-8 space-y-6 pb-8">
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="size-5" />
                                            <h3 className="text-lg font-semibold">Group Sessions</h3>
                                        </div>
                                        <div className="space-y-4 text-sm">
                                            <div className="flex gap-4">
                                                <div className="font-mono text-muted-foreground">01</div>
                                                <div>
                                                    <h4 className="font-medium">Setup</h4>
                                                    <p className="text-muted-foreground">Create a session and share the generated URL with other users.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="font-mono text-muted-foreground">02</div>
                                                <div>
                                                    <h4 className="font-medium">Matching Logic</h4>
                                                    <ul className="mt-1 space-y-1 text-muted-foreground">
                                                        <li>• <strong>Unanimous:</strong> Requires all participants to like the title.</li>
                                                        <li>• <strong>Majority:</strong> Matches when two or more participants agree.</li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="font-mono text-muted-foreground">03</div>
                                                <div>
                                                    <h4 className="font-medium">Limits</h4>
                                                    <p className="text-muted-foreground">Configure maximum likes or matches per session to expedite selection.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                    <div className="p-4 rounded-xl border flex gap-4">
                                        <Trophy className="size-4 mt-1 shrink-0" />
                                        <p className="text-sm text-muted-foreground">
                                            Use the <strong>Random Selection</strong> button on the Matches screen to pick one title from your current matches.
                                        </p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="guest" className="mt-8 space-y-6 pb-8">
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="size-5" />
                                            <h3 className="text-lg font-semibold">Guest Access</h3>
                                        </div>
                                        <div className="p-4 rounded-xl border bg-muted/30 text-sm space-y-3">
                                            <p className="text-muted-foreground">Enable this to allow users without Jellyfin accounts to join your session.</p>
                                            <ul className="space-y-2 list-disc pl-4 text-muted-foreground">
                                                <li>Guests connect via proxy (no direct account access).</li>
                                                <li>Likes are isolated to the specific session.</li>
                                                <li>Temporary access expires when the session is closed.</li>
                                            </ul>
                                        </div>
                                    </section>
                                </TabsContent>

                                <TabsContent value="shortcuts" className="mt-8 pb-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-12">
                                        {[
                                            { label: "Like", keys: ["→", "D"] },
                                            { label: "Pass", keys: ["←", "A"] },
                                            { label: "Undo", keys: ["R", "⌫"] },
                                            { label: "Details", keys: ["⏎", "␣"] },
                                            { label: "Filters", keys: ["F"] },
                                            { label: "Settings", keys: ["S", ","] },
                                            { label: "Session Info", keys: ["M", "C"] },
                                            { label: "Nav Tabs", keys: ["1", "2"] },
                                        ].map((item) => (
                                            <div key={item.label} className="flex items-center justify-between border-b border-border pb-2">
                                                <span className="text-sm text-muted-foreground">{item.label}</span>
                                                <div className="flex gap-1">
                                                    {item.keys.map(k => <Kbd key={k}>{k}</Kbd>)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>
                            </motion.div>
                        </ScrollArea>
                    </Tabs>
                </div>
            </DrawerContent>
        </Drawer>
    )
}