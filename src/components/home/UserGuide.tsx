"use client"

import ReactMarkdown from 'react-markdown'
import useSWR from 'swr'
import axios from 'axios'
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { Kbd } from "@/components/ui/kbd"

const fetcher = (url: string) => axios.get(url).then(res => res.data)

interface UserGuideProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function UserGuide({ open, onOpenChange }: UserGuideProps) {
    const { data: content, isLoading } = useSWR('/docs/user-guide.md', fetcher)

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <DrawerHeader className="border-b">
                    <DrawerTitle>User Guide</DrawerTitle>
                    <DrawerDescription>Learn how to use Swiparr</DrawerDescription>
                </DrawerHeader>
                <ScrollArea className="px-6 h-[55vh]">
                    <div className="prose dark:prose-invert max-w-none py-8">
                        {isLoading ? (
                            <div className="flex justify-center p-8">
                                <Spinner className="size-6" />
                            </div>
                        ) : (
                            <ReactMarkdown
                                components={{
                                    h1: ({ ...props }) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                                    h2: ({ ...props }) => <h2 className="text-xl font-semibold mt-6 mb-3" {...props} />,
                                    p: ({ ...props }) => <p className="mb-4 text-muted-foreground" {...props} />,
                                    ul: ({ ...props }) => <ul className="list-disc pl-6 mb-4 text-muted-foreground" {...props} />,
                                    li: ({ ...props }) => <li className="mb-1" {...props} />,
                                    strong: ({ ...props }) => <strong className="font-bold text-foreground" {...props} />,
                                    code: ({ children }) => <Kbd className="mx-0.5">{children}</Kbd>,
                                }}
                            >
                                {content}
                            </ReactMarkdown>
                        )}
                    </div>
                </ScrollArea>
            </DrawerContent>
        </Drawer>
    )
}
