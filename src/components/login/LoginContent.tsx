"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuickConnectUpdates } from "@/lib/use-updates";
import { Copy, Check, ShieldCheck, ArrowRight } from "lucide-react";
import Image from "next/image";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "../../../public/icon0.svg"
import { Label } from "../ui/label";

export default function LoginContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestSessionCode, setGuestSessionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [wasMadeAdmin, setWasMadeAdmin] = useState(false);
  const searchParams = useSearchParams();
  const sessionCodeParam = useMemo(() => {
    const directJoin = searchParams.get("join");
    if (directJoin) return directJoin;

    const callbackUrl = searchParams.get("callbackUrl");
    if (callbackUrl) {
      try {
        const url = new URL(callbackUrl, "http://n");
        return url.searchParams.get("join");
      } catch {
        return null;
      }
    }
    return null;
  }, [searchParams]);

  const [activeTab, setActiveTab] = useState<string>("login");

  useEffect(() => {
    if (sessionCodeParam) {
      setActiveTab("join");
    }
  }, [sessionCodeParam]);

  const [qcCode, setQcCode] = useState<string | null>(null);
  const [qcSecret, setQcSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    if (qcCode) {
      await navigator.clipboard.writeText(qcCode);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const onAuthorized = useCallback((data?: any) => {
    if (data?.wasMadeAdmin) {
      setWasMadeAdmin(true);
      setLoading(false);
    } else {
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      window.location.href = callbackUrl;
    }
  }, [searchParams]);

  useQuickConnectUpdates(qcSecret, onAuthorized);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const promise = async () => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Login failed");
      return res.json();
    };

    toast.promise(promise(), {
      loading: "Logging in...",
      success: (data) => {
        if (data.wasMadeAdmin) {
          setWasMadeAdmin(true);
          setLoading(false);
          return "Admin account initialized";
        }
        const callbackUrl = searchParams.get("callbackUrl") || "/";
        window.location.href = callbackUrl;
        setLoading(false);
        return "Logged in successfully";
      },
      error: () => {
        setLoading(false);
        return "Login Failed: Check your credentials";
      },
    });
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = sessionCodeParam || guestSessionCode;
    if (!guestName || !code) return;
    setLoading(true);

    const promise = async () => {
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        body: JSON.stringify({ username: guestName, sessionCode: code }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Guest login failed");
      return data;
    };

    toast.promise(promise(), {
      loading: "Joining as guest...",
      success: (data) => {
        window.location.href = "/";
        return `Joined as ${data.user.Name}`;
      },
      error: (err) => {
        setLoading(false);
        return err.message;
      },
    });
  };

  const continueToApp = () => {
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    window.location.href = callbackUrl;
  };

  const startQuickConnect = async () => {
    setLoading(true);

    const promise = async () => {
      const res = await fetch("/api/auth/quick-connect");
      const data = await res.json();
      if (!data.Code) throw new Error("Quick connect failed");
      return data;
    };

    toast.promise(promise(), {
      loading: "Starting quick connect...",
      success: (data) => {
        setQcCode(data.Code);
        setQcSecret(data.Secret);
        setLoading(false);
        return "Quick connect started";
      },
      error: () => {
        setLoading(false);
        return "Quick connect failed to initialize";
      },
    });
  };

  return (

    <Card className="w-full max-w-xs border-border bg-card text-card-foreground">
      <CardHeader>
        <Image src={logo} alt="Logo" className="size-16 mx-auto mb-2"/>
        <CardTitle className="text-center text-2xl font-bold text-primary">
          Swiparr
        </CardTitle>
      </CardHeader>
      <CardContent className="h-70">
        {wasMadeAdmin ? (
          <div className="flex flex-col space-y-4 h-full">
            <Alert className="bg-primary/10 border-primary/20">
              <ShieldCheck className="size-4 text-primary" />
              <AlertTitle className="text-primary font-bold">Admin Privileges</AlertTitle>
              <AlertDescription className="text-xs text-primary/80">
                You are the first user and have been set as the administrator.
              </AlertDescription>
            </Alert>
            <div className="flex-1 flex items-end pb-4">
              <Button onClick={continueToApp} className="w-full group">
                Continue
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="join">Guest</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              {qcCode ? (
                <div className="flex flex-col items-center space-y-6 py-4">
                  <div className="relative group">
                    <div className="flex flex-row text-3xl font-black tracking-[0.5em] text-primary bg-muted p-4 rounded-lg border border-primary/20">
                      {qcCode}
                      <Button
                        variant="outline"
                        size="icon"
                        className="ml-2"
                        onClick={copyToClipboard}
                        title="Copy to clipboard"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 " />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Go to <span className="text-foreground font-semibold">Settings &gt; Quick Connect</span> on your logged-in device to authorize.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQcCode(null)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-3">
                  <Input
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-muted border-input"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-muted border-input"
                  />
                  <Button type="submit" className="w-full mt-2" disabled={loading}>
                    {loading ? "Connecting..." : "Log in"}
                  </Button>
                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                    <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
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
                </form>
              )}
            </TabsContent>

            <TabsContent value="join" className="space-y-4">
              <form onSubmit={handleGuestLogin} className="space-y-3">
                <Input
                  placeholder="Display name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="bg-muted border-input"
                  autoFocus
                />
                <Label htmlFor="session-code" className="mt-1.5 mb-2 text-muted-foreground"> Session code</Label>
                {!sessionCodeParam && (
                  <Input
                    id="session-code"
                    value={guestSessionCode}
                    onChange={(e) => setGuestSessionCode(e.target.value.toUpperCase())}
                    className="bg-muted border-input font-mono tracking-widest uppercase"
                    maxLength={4}
                  />
                )}
                <div className="pt-2">
                  <Button type="submit" className="w-full" disabled={loading || !guestName || (!sessionCodeParam && !guestSessionCode)}>
                    {loading ? "Joining..." : "Join as Guest"}
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground pt-2">
                  Joining as a guest lets you swipe in a session without a Jellyfin account.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}