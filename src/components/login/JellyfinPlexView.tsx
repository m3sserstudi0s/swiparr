import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CardDescription } from "@/components/ui/card";
import { QuickConnectView } from "./QuickConnectView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangleIcon } from "lucide-react"

interface JellyfinPlexViewProps {
  provider: string;
  providerLock: boolean;
  serverUrl: string;
  setServerUrl: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  password: string;
  setPassword: (val: string) => void;
  guestName: string;
  setGuestName: (val: string) => void;
  guestSessionCode: string;
  setGuestSessionCode: (val: string) => void;
  loading: boolean;
  handleLogin: (e: React.FormEvent) => void;
  handleGuestLogin: (e: React.FormEvent) => void;
  startQuickConnect: () => void;
  qcCode: string | null;
  copied: boolean;
  copyToClipboard: () => void;
  setQcCode: (val: string | null) => void;
  sessionCodeParam: string | null;
  hasQuickConnect: boolean;
  isExperimental: boolean;
}

export function JellyfinPlexView({
  provider,
  providerLock,
  serverUrl,
  setServerUrl,
  username,
  setUsername,
  password,
  setPassword,
  guestName,
  setGuestName,
  guestSessionCode,
  setGuestSessionCode,
  loading,
  handleLogin,
  handleGuestLogin,
  startQuickConnect,
  qcCode,
  copied,
  copyToClipboard,
  setQcCode,
  sessionCodeParam,
  hasQuickConnect,
  isExperimental
}: JellyfinPlexViewProps) {
  const [activeTab, setActiveTab] = useState<string>("login");

  useEffect(() => {
    if (sessionCodeParam) {
      setActiveTab("join");
    }
  }, [sessionCodeParam]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="login">Log in</TabsTrigger>
        <TabsTrigger value="join">Guest</TabsTrigger>
      </TabsList>
      <TabsContent value="login" className="space-y-4">
        {qcCode ? (
          <QuickConnectView
            qcCode={qcCode}
            copied={copied}
            onCopy={copyToClipboard}
            onCancel={() => setQcCode(null)}
          />
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <CardDescription>
              Enter your {provider === "jellyfin" ? "Jellyfin" : provider === "emby" ? "Emby" : "Plex"} credentials
            </CardDescription>

            {!providerLock && (
              <Input
                placeholder={
                  provider === "jellyfin"
                    ? "Jellyfin Server URL"
                    : provider === "emby"
                    ? "Emby Server URL"
                    : "Plex Server URL"
                }
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="bg-muted border-input text-xs h-8"
              />
            )}

            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-muted border-input"
            />
            <Input
              type="password"
              placeholder={provider === "plex" ? "Token" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-muted border-input"
            />
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? "Connecting..." : "Log in"}
            </Button>

            {hasQuickConnect && (
              <>
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full hover:bg-accent h-9"
                  onClick={startQuickConnect}
                  disabled={loading}
                >
                  Quick Connect
                </Button>
              </>
            )}
            {isExperimental && (
              <Alert className="max-w-full mt-2 ">
                <AlertTriangleIcon className="text-amber-600!"/>
                <AlertTitle>Experimental provider integration</AlertTitle>
                <AlertDescription className="text-xs">
                  Certain features may not work as expected.
                </AlertDescription>
              </Alert>
            )}
          </form>
        )}
      </TabsContent>
      <TabsContent value="join" className="space-y-4">
        <form onSubmit={handleGuestLogin} className="space-y-3">
          <CardDescription>Enter a display name to continue</CardDescription>
          <Input
            placeholder="Display name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="bg-muted border-input"
            autoFocus
          />
          {!sessionCodeParam && (
            <>
              <Label htmlFor="session-code" className="mt-1.5 mb-2 text-muted-foreground">
                {" "}
                Session code
              </Label>
              <Input
                id="session-code"
                value={guestSessionCode}
                onChange={(e) => setGuestSessionCode(e.target.value.toUpperCase())}
                className="bg-muted border-input font-mono tracking-widest uppercase"
                maxLength={4}
              />
            </>
          )}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full"
              disabled={loading || !guestName || !guestSessionCode}
            >
              {loading ? "Joining..." : "Join"}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground pt-2">
            Joining as a guest lets you swipe in a session without an account.
          </p>
        </form>
      </TabsContent>
    </Tabs>
  );
}
