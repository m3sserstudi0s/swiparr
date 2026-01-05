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
    HandHelping,
    Keyboard,
    Filter,
    Settings,
    Zap,
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
                    <DrawerTitle>
                        User guide
                    </DrawerTitle>
                    <DrawerDescription>Learn how to use Swiparr</DrawerDescription>
                </DrawerHeader>

                <div className="px-6 py-4">
                    <Tabs defaultValue="basics" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 h-11">
                            <TabsTrigger value="basics" className="gap-2">
                                Basics
                            </TabsTrigger>
                            <TabsTrigger value="sessions" className="gap-2">
                                Sessions
                            </TabsTrigger>
                            <TabsTrigger value="guest" className="gap-2">
                                Guest
                            </TabsTrigger>
                            <TabsTrigger value="shortcuts" className="gap-2">
                                Shortcuts
                            </TabsTrigger>
                        </TabsList>

                        <ScrollArea className="h-[50vh] mt-4 pr-4">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <TabsContent value="basics" className="mt-6 space-y-6 pb-8">
                                    <section>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            Basics
                                        </h3>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-2 rounded-lg ">
                                                        <Heart className="size-4" />
                                                    </div>
                                                    <span className="font-medium">Swipe Right</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">If others in your session also like it, you've got a match.</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-2 rounded-lg text-foreground">
                                                        <X className="size-4" />
                                                    </div>
                                                    <span className="font-medium">Swipe Left</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">Swipe left to pass and see the next title.</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-2 rounded-lg ">
                                                        <RotateCcw className="size-4" />
                                                    </div>
                                                    <span className="font-medium">Rewind</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">Use rewind to bring back the last card.</p>
                                            </div>
                                            <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="p-2 rounded-lg ">
                                                        <Info className="size-4" />
                                                    </div>
                                                    <span className="font-medium">Details</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground">Tap a card to see descriptions, trailers, and more info.</p>
                                            </div>
                                        </div>
                                    </section>

                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-4">
                                        <div className="p-2 rounded-full bg-primary/10 h-fit">
                                            <Filter className="size-4 text-primary" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium text-primary mb-1">Pro Tip</h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                Use the filters to narrow down your search by Genre, Year, or Rating. You can also sync your likes with your Jellyfin Watchlist or Favorites!
                                            </p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="sessions" className="mt-6 space-y-6 pb-8">
                                    <section>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            <Users className="size-5" />
                                            Group Sessions
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Create a session to sync with friends. Swiparr will automatically detect when you've found common ground.
                                        </p>

                                        <div className="space-y-4">
                                            <div className="flex gap-4">
                                                <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 font-bold text-xs">1</div>
                                                <div>
                                                    <h4 className="font-medium text-foreground">Create & Invite</h4>
                                                    <p className="text-sm text-muted-foreground">Start a session and share the link with your group.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 font-bold text-xs">2</div>
                                                <div>
                                                    <h4 className="font-medium text-foreground">Match Strategies</h4>
                                                    <div className="mt-2 space-y-2">
                                                        <div className="text-sm">
                                                            <span className="font-semibold">Unanimous:</span> Everyone must like it to match.
                                                        </div>
                                                        <div className="text-sm">
                                                            <span className="font-semibold">Two or more:</span> Matches as soon as two people agree.
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="size-8 rounded-full bg-muted flex items-center justify-center shrink-0 font-bold text-xs">3</div>
                                                <div>
                                                    <h4 className="font-medium text-foreground">Restrictions</h4>
                                                    <p className="text-sm text-muted-foreground">Set limits on total likes, nopes, or matches to speed up and tweak the session experience.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <div className="p-4 rounded-xl border flex gap-4">
                                        <div className="p-2 rounded-full bg-yellow-500/10 h-fit">
                                            <Trophy className="size-4" />
                                        </div>
                                        <div>
                                            <h4 className="font-medium mb-1">Decision Paralysis?</h4>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                Can't decide among your matches? Use the <strong>Random button</strong> in the matches screen to let fate decide your movie night.
                                            </p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="guest" className="mt-6 space-y-6 pb-8">
                                    <section>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            Guest Access (Lending)
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Have friends without Jellyfin accounts? Use Guest Mode to "lend" them your connection.
                                        </p>

                                        <div className="grid gap-4">
                                            <div className="p-4 rounded-xl border border-border bg-muted/30">
                                                <h4 className="font-medium flex items-center gap-2 mb-2">
                                                    <ShieldCheck className="size-4 " />
                                                    Safe
                                                </h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Guests use a proxy connection. They can't see your favorites, change your settings, or access your Jellyfin account directly.
                                                </p>
                                            </div>
                                            <div className="p-4 rounded-xl border border-border bg-muted/30">
                                                <h4 className="font-medium mb-2">How it works</h4>
                                                <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
                                                    <li>Enable "Guest lending" in your settings.</li>
                                                    <li>Guests choose a display name when joining.</li>
                                                    <li>Their likes are tracked separately for matches.</li>
                                                    <li>When the session ends, their temporary access expires.</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </section>
                                </TabsContent>

                                <TabsContent value="shortcuts" className="mt-6 pb-8">
                                    <section>
                                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                            <Keyboard className="size-5" />
                                            Keyboard Shortcuts
                                        </h3>
                                        <div className="grid grid-cols-2 gap-y-3 gap-x-8">
                                            <div className="flex items-center justify-between border-b border-border pb-2">
                                                <span className="text-sm text-muted-foreground">Swipe Left</span>
                                                <div className="flex gap-1">
                                                    <Kbd>←</Kbd>
                                                    <Kbd>A</Kbd>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-border pb-2">
                                                <span className="text-sm text-muted-foreground">Swipe Right</span>
                                                <div className="flex gap-1">
                                                    <Kbd>→</Kbd>
                                                    <Kbd>D</Kbd>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-border pb-2">
                                                <span className="text-sm text-muted-foreground">Rewind</span>
                                                <div className="flex gap-1">
                                                    <Kbd>R</Kbd>
                                                    <Kbd>⌫</Kbd>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-border pb-2">
                                                <span className="text-sm text-muted-foreground">Details</span>
                                                <div className="flex gap-1">
                                                    <Kbd>⏎</Kbd>
                                                    <Kbd>␣</Kbd>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-border pb-2">
                                                <span className="text-sm text-muted-foreground">Filters</span>
                                                <Kbd>F</Kbd>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-border pb-2">
                                                <span className="text-sm text-muted-foreground">Settings</span>
                                                <div className="flex gap-1">
                                                    <Kbd>S</Kbd>
                                                    <Kbd>,</Kbd>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-border pb-2">
                                                <span className="text-sm text-muted-foreground">Session</span>
                                                <div className="flex gap-1">
                                                    <Kbd>M</Kbd>
                                                    <Kbd>C</Kbd>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between border-b border-border pb-2">
                                                <span className="text-sm text-muted-foreground">Navigation</span>
                                                <div className="flex gap-1 text-[10px] font-mono">
                                                    <Kbd>1</Kbd>
                                                    <Kbd>2</Kbd>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </TabsContent>
                            </motion.div>
                        </ScrollArea>
                    </Tabs>
                </div>
            </DrawerContent>
        </Drawer>
    )
}
