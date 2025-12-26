"use client";
import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

// 1. Move all the logic into a separate component
function LoginContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  
  const [qcCode, setQcCode] = useState<string | null>(null);
  const [qcSecret, setQcSecret] = useState<string | null>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

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

  useEffect(() => {
    if (qcSecret) {
      pollInterval.current = setInterval(async () => {
        try {
          const res = await fetch("/api/auth/quick-connect", {
            method: "POST",
            body: JSON.stringify({ secret: qcSecret }),
            headers: { "Content-Type": "application/json" },
          });
          const data = await res.json();
          if (data.success) {
            if (pollInterval.current) clearInterval(pollInterval.current);
            window.location.href = searchParams.get("callbackUrl") || "/";
          }
        } catch (err) {
          console.error("Polling error", err);
        }
      }, 5000);
    }
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [qcSecret, searchParams]);

  return (
    <Card className="w-full max-w-xs border-neutral-800 bg-neutral-900 text-neutral-100">
      <CardHeader>
        <CardTitle className="text-center text-2xl font-bold text-primary font-mono">
          Swiparr
        </CardTitle>
        <p className="text-center text-sm text-neutral-400">
          {qcCode ? "Authorize this code in Jellyfin" : "Enter your Jellyfin credentials"}
        </p>
      </CardHeader>
      <CardContent>
        {!qcCode ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-neutral-800 border-neutral-700"
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-neutral-800 border-neutral-700"
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Connecting..." : "Log in"}
            </Button>
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-neutral-800" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-neutral-900 px-2 text-neutral-500">Or</span></div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full border-neutral-700 hover:bg-neutral-800"
              onClick={startQuickConnect}
              disabled={loading}
            >
              Quick Connect
            </Button>
          </form>
        ) : (
          <div className="flex flex-col items-center space-y-6 py-4">
            <div className="text-4xl font-black tracking-[0.5em] text-primary bg-neutral-800 p-6 rounded-lg border border-primary/20">
              {qcCode}
            </div>
            <p className="text-xs text-center text-neutral-500">
              Go to <span className="text-neutral-300">Settings &gt; Quick Connect</span> on your logged-in device to authorize.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQcCode(null)}
              className="text-neutral-500 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 2. Wrap the logic in Suspense in the default export
export default function LoginPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-neutral-950 p-4">
      <Suspense fallback={<div className="text-white">Loading...</div>}>
        <LoginContent />
      </Suspense>
    </div>
  );
}