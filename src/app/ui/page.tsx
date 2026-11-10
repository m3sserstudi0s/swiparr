import type { Metadata } from "next";
import { Check, TriangleAlert, Info, Settings, Search, X, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Kbd } from "@/components/ui/kbd";

export const metadata: Metadata = {
  title: "Messer UI — sink",
  robots: { index: false, follow: false },
};

/**
 * The conformance sink: every atom this app ships, rendered from the real components so
 * `messer check` can read computed styles. Port-1 components only — the capability matrix in
 * messer-ui/canon/rules.md says which ones exist here.
 */
export default function SinkPage() {
  return (
    <main className="mx-auto grid max-w-[1200px] gap-6 p-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <span className="m-label" data-fixture="label">
            messer-ui · messer-swipe
          </span>
          <h1 data-fixture="h1">Kitchen sink</h1>
          <p className="text-muted-foreground text-sm">
            Port 1 · <code>brand-messer-swipe</code> · measured by <code>messer check</code>.
          </p>
        </div>
        <Button size="sm" variant="outline">
          <Settings />
          Theme
        </Button>
      </header>

      <Separator />

      <div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
        {/* type */}
        <Card>
          <CardHeader>
            <span className="m-label">Type</span>
          </CardHeader>
          <CardContent className="grid gap-3">
            <h2 data-fixture="h2">Section heading</h2>
            <h3 data-fixture="h3">Panel heading</h3>
            <h4 data-fixture="h4">Sub-label heading</h4>
            <p data-fixture="body" className="m-0">
              Body copy sits in Golos Text at 14px. The quick brown fox jumps over the lazy dog.
            </p>
            <p className="prose m-0" data-fixture="prose">
              Prose runs at 15px/1.6 with a 68ch measure.
            </p>
            <p className="text-muted-foreground m-0 text-xs" data-fixture="small">
              Small text for hints and captions.
            </p>
            <span className="m-data" data-fixture="data">
              2026-11-08 · 14,208 ms · #4A9F
            </span>
            <span className="flex items-center gap-2">
              <code data-fixture="code">npm run check</code>
              <Kbd data-fixture="kbd">⌘K</Kbd>
            </span>
          </CardContent>
        </Card>

        {/* buttons */}
        <Card>
          <CardHeader>
            <span className="m-label">Buttons</span>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button data-fixture="btn-primary">
                <Check />
                Publish
              </Button>
              <Button variant="outline" data-fixture="btn-secondary">
                Cancel
              </Button>
              <Button variant="ghost" data-fixture="btn-ghost">
                Skip
              </Button>
              <Button variant="destructive" data-fixture="btn-danger">
                Delete
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" data-fixture="btn-sm">
                Small
              </Button>
              <Button size="lg" data-fixture="btn-lg">
                Large
              </Button>
              <Button size="icon" variant="outline" data-fixture="btn-icon" aria-label="Search">
                <Search />
              </Button>
              <Button disabled data-fixture="btn-disabled">
                Disabled
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* fields */}
        <Card>
          <CardHeader>
            <span className="m-label">Fields</span>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sink-name">Name</Label>
              <Input id="sink-name" defaultValue="Messer Swipe" data-fixture="input" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sink-note">Notes</Label>
              <Textarea id="sink-note" placeholder="Anything to remember" data-fixture="textarea" />
            </div>
            <div className="flex items-center gap-3">
              <Switch id="sink-switch" defaultChecked data-fixture="switch" />
              <Label htmlFor="sink-switch">Enabled</Label>
            </div>
          </CardContent>
        </Card>

        {/* surface */}
        <Card data-fixture="panel">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle data-fixture="panel-title">Library sync</CardTitle>
            <StatusBadge status="success" data-fixture="badge-success">Healthy</StatusBadge>
          </CardHeader>
          <CardContent className="grid gap-3">
            <span className="m-data">last run 4 min ago · 208 items</span>
            <span className="bg-muted block h-1 w-full overflow-hidden">
              <span className="bg-primary block h-full w-[62%]" />
            </span>
            <p className="text-muted-foreground m-0 text-xs">
              Progress reads from the accent only — it is not a status colour.
            </p>
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button size="sm" variant="outline">
              Run
            </Button>
            <Button size="sm">Open</Button>
          </CardFooter>
        </Card>

        {/* status */}
        <Card>
          <CardHeader>
            <span className="m-label">Status</span>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status="neutral" data-fixture="badge-neutral">Idle</StatusBadge>
              <StatusBadge status="success" data-fixture="badge-success-2">Running</StatusBadge>
              <StatusBadge status="warning" data-fixture="badge-warning">Degraded</StatusBadge>
              <StatusBadge status="danger" data-fixture="badge-danger">Stopped</StatusBadge>
            </div>
            <Alert data-fixture="alert">
              <Info />
              <AlertDescription>Neutral note. Hairline borders, no shadow.</AlertDescription>
            </Alert>
            <div className="grid gap-2">
              <span className="m-label">Skeleton</span>
              <Skeleton className="h-8 w-full" data-fixture="skeleton" />
            </div>
          </CardContent>
        </Card>

        {/* table + avatars */}
        <Card>
          <CardHeader>
            <span className="m-label">Data</span>
          </CardHeader>
          <CardContent className="grid gap-4">
            <table className="w-full border-collapse text-sm" data-fixture="table">
              <thead>
                <tr>
                  <th
                    className="text-muted-foreground border-border border-b px-2 py-1.5 text-left font-mono text-[10.5px] font-medium tracking-[0.1em] uppercase"
                    data-fixture="table-th"
                  >
                    Container
                  </th>
                  <th className="text-muted-foreground border-border border-b px-2 py-1.5 text-left font-mono text-[10.5px] font-medium tracking-[0.1em] uppercase">
                    State
                  </th>
                  <th
                    className="text-muted-foreground border-border border-b px-2 py-1.5 text-right font-mono text-[10.5px] font-medium tracking-[0.1em] uppercase"
                    data-fixture="table-num"
                  >
                    Uptime
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border-border border-b px-2 py-2">
                    <code>caddy</code>
                  </td>
                  <td className="border-border border-b px-2 py-2">
                    <Badge variant="outline" className="text-success">
                      <Check />
                      Running
                    </Badge>
                  </td>
                  <td className="border-border border-b px-2 py-2 text-right font-mono">14d 02h</td>
                </tr>
                <tr>
                  <td className="border-border border-b px-2 py-2">
                    <code>immich-ml</code>
                  </td>
                  <td className="border-border border-b px-2 py-2">
                    <Badge variant="outline" className="text-warning">
                      <TriangleAlert />
                      Degraded
                    </Badge>
                  </td>
                  <td className="border-border border-b px-2 py-2 text-right font-mono">02h 11m</td>
                </tr>
              </tbody>
            </table>
            <div className="flex items-center gap-3">
              <Avatar data-fixture="avatar">
                <AvatarFallback>JB</AvatarFallback>
              </Avatar>
              <Badge variant="outline">
                <span className="bg-success inline-block size-1.5 rounded-full" data-fixture="dot" />
                Online
              </Badge>
            </div>
            <div className="flex gap-0" aria-hidden>
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="border-border h-8 flex-1 border"
                  style={{ background: `var(--chart-${i})` }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <p className="text-muted-foreground text-xs">
        Dialog, sheet, drawer, popover, dropdown, tooltip and combobox are port-1 only and are not
        rendered here — they need interaction, not a snapshot.
      </p>
    </main>
  );
}
