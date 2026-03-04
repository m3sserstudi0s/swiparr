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
import { useTranslations } from 'next-intl'

interface UserGuideProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function UserGuide({ open, onOpenChange }: UserGuideProps) {
    const t = useTranslations('UserGuide');
  const tUI = useTranslations('UI');
    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <DrawerHeader className="border-b">
                    <DrawerTitle>{tUI('userGuide')}</DrawerTitle>
                    <DrawerDescription>{t('description')}</DrawerDescription>
                </DrawerHeader>
                <div className="px-6 py-4">
                    <Tabs defaultValue="basics" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 h-11">
                            <TabsTrigger value="basics">{t('tabBasics')}</TabsTrigger>
                            <TabsTrigger value="sessions">{tUI('sessions')}</TabsTrigger>
                            <TabsTrigger value="guest">{tUI('guestTab')}</TabsTrigger>
                            <TabsTrigger value="shortcuts">{t('tabHotkeys')}</TabsTrigger>
                        </TabsList>
                        <ScrollArea className="h-[50vh] leading-3 text-pretty">
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
                                                <span className="font-semibold text-sm tracking-wide">{t('swipeRight')}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium">{t('swipeRightDesc')}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                                <X className="size-4" />
                                                <span className="font-semibold text-sm tracking-wide">{t('swipeLeft')}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium">{t('swipeLeftDesc')}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                                <RotateCcw className="size-4" />
                                                <span className="font-semibold text-sm tracking-wide">{t('rewind')}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium">{t('rewindDesc')}</p>
                                        </div>
                                        <div className="p-4 rounded-xl bg-muted/50 border border-border">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Info className="size-4" />
                                                <span className="font-semibold text-sm tracking-wide">{tUI('details')}</span>
                                            </div>
                                            <p className="text-sm text-muted-foreground font-medium">{t('detailsDesc')}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex gap-4">
                                        <Filter className="size-4 text-primary mt-1 shrink-0" />
                                        <p className="text-sm text-muted-foreground">
                                            {t('filterInfo')}
                                        </p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="sessions" className="mt-8 space-y-6 pb-8">
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Users className="size-5" />
                                            <h3 className="text-lg font-semibold">{t('groupSessions')}</h3>
                                        </div>
                                        <div className="space-y-4 text-sm">
                                            <div className="flex gap-4">
                                                <div className="font-mono text-muted-foreground text-base mt-px">01</div>
                                                <div>
                                                    <h4 className="font-medium text-base">{t('setupTitle')}</h4>
                                                    <p className="text-muted-foreground">{t('setupDesc')}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="font-mono text-muted-foreground text-base mt-px">02</div>
                                                <div>
                                                    <h4 className="font-medium text-base">{t('matchLogicTitle')}</h4>
                                                    <ul className="mt-1 space-y-1 text-muted-foreground">
                                                        <li><strong>{t('matchUnanimous')}</strong> {t('matchUnanimousDesc')}</li>
                                                        <li><strong>{t('matchMajority')}</strong> {t('matchMajorityDesc')}</li>
                                                    </ul>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="font-mono text-muted-foreground text-base mt-px">03</div>
                                                <div>
                                                    <h4 className="font-medium text-base">{t('limitsTitle')}</h4>
                                                    <p className="text-muted-foreground">{t('limitsDesc')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                    <div className="p-4 rounded-xl border flex gap-4">
                                        <Trophy className="size-4 mt-1 shrink-0" />
                                        <p className="text-sm text-muted-foreground">
                                            {t.rich('randomSelectionInfo', {
                                                bold: (children) => <strong>{children}</strong>
                                            })}
                                        </p>
                                    </div>
                                </TabsContent>

                                <TabsContent value="guest" className="mt-8 space-y-6 pb-8">
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="size-5" />
                                            <h3 className="text-lg font-semibold">{t('guestAccess')}</h3>
                                        </div>
                                        <div className="p-4 rounded-xl border bg-muted/30 text-sm space-y-3">
                                            <p className="font-medium">{t('guestDesc')}</p>
                                            <ul className="space-y-2 list-disc pl-4 text-muted-foreground">
                                                <li>{t('guestPoint1')}</li>
                                                <li>{t('guestPoint2')}</li>
                                                <li>{t('guestPoint3')}</li>
                                            </ul>
                                        </div>
                                    </section>
                                </TabsContent>

                                <TabsContent value="shortcuts" className="mt-8 pb-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-12">
                                        {[
                                            { label: tUI('like'), keys: ["→", "D"] },
                                            { label: t('hkPass'), keys: ["←", "A"] },
                                            { label: t('hkUndo'), keys: ["R", "⌫"] },
                                            { label: tUI('details'), keys: ["⏎", "␣"] },
                                            { label: tUI('filtersTitle'), keys: ["F"] },
                                            { label: tUI('settingsTitle'), keys: ["S", ","] },
                                            { label: t('hkSessionInfo'), keys: ["M", "C"] },
                                            { label: t('hkNavTabs'), keys: ["1", "2"] },
                                        ].map((item) => (
                                            <div key={item.label} className="flex items-center justify-between border-b border-border pb-2">
                                                <span className="text-base">{item.label}</span>
                                                <div className="flex gap-1">
                                                    {item.keys.map(k => <Kbd size={'lg'} key={k}>{k}</Kbd>)}
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
