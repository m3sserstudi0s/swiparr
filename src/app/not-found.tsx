import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Home } from "lucide-react"
import { getRuntimeConfig } from '@/lib/runtime-config'

export default function NotFound() {
  const { basePath } = getRuntimeConfig();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-xs border-border bg-card text-card-foreground shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-4xl font-black text-primary font-mono">
            Oops!
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground uppercase tracking-widest font-medium">
            Lost in the deck
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6 pb-8 text-center">
          <p className="text-sm text-muted-foreground">
            This place doesn't exist. Let's get you back to swiping.
          </p>
          <Button asChild className="w-full">
            <Link href={`${basePath}/`}>
              <Home className="mr-2 size-4" />
              Return
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
