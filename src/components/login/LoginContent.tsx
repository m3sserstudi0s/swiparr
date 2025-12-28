"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuickConnectUpdates } from "@/lib/use-updates";
import { Copy, Check } from "lucide-react";

export default function LoginContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

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

  const checkAuth = useCallback(async (secret: string) => {
    try {
      const res = await fetch("/api/auth/quick-connect", {
        method: "POST",
        body: JSON.stringify({ secret }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = searchParams.get("callbackUrl") || "/";
      }
    } catch (err) {
      console.error("Auth check error", err);
    }
  }, [searchParams]);

  const onAuthorized = useCallback(() => {
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    window.location.href = callbackUrl;
  }, [searchParams]);

  useQuickConnectUpdates(qcSecret, onAuthorized);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const callbackUrl = searchParams.get("callbackUrl") || "/";
        window.location.href = callbackUrl;
      } else {
        toast.error("Login Failed", {
          description: "Check your Jellyfin credentials/URL",
        });
        setLoading(false);
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const startQuickConnect = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/quick-connect");
      const data = await res.json();
      if (data.Code) {
        setQcCode(data.Code);
        setQcSecret(data.Secret);
        toast.info("Quick Connect Started", { description: "Enter the code on your other device." });
      }
    } catch (err) {
      toast.error("Quick Connect failed to initialize");
    } finally {
      setLoading(false);
    }
  };

  return (

    <Card className="w-full max-w-xs border-border bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold text-primary font-mono">
          Swiparr
        </CardTitle>
        <p className="text-center text-sm text-muted-foreground">
          {qcCode ? "Authorize this code in Jellyfin" : "Enter your Jellyfin credentials"}
        </p>
      </CardHeader>
      <CardContent className="h-60">
        {!qcCode ? (
          <form onSubmit={handleLogin} className="space-y-4">
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connecting..." : "Log in"}
            </Button>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full hover:bg-accent"
              onClick={startQuickConnect}
              disabled={loading}
            >
              Quick Connect
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="relative group">
              <div className="flex flex-row text-3xl font-black tracking-[0.5em] text-primary bg-muted p-6 rounded-lg border border-primary/20">
                {qcCode}
                <Button
                  variant="outline"
                  size="icon"
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
              Go to <span className="text-foreground">Settings &gt; Quick Connect</span> on your logged-in device to authorize.
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
        )}
      </CardContent>
    </Card>
  );
}