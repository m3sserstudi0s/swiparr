"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuickConnectUpdates } from "@/lib/use-updates";
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "../../../public/icon0.svg"
import { apiClient } from "@/lib/api-client";
import { cn, getErrorMessage } from "@/lib/utils";
import { useRuntimeConfig } from "@/lib/runtime-config";

import { AdminInitializedView } from "./AdminInitializedView";
import { JellyfinPlexView } from "./JellyfinPlexView";
import { TmdbView } from "./TmdbView";
import { SiPlex, SiJellyfin, SiThemoviedatabase } from "react-icons/si";

export default function LoginContent() {
  const { capabilities, basePath, provider, providerLock } = useRuntimeConfig();

  const [selectedProvider, setSelectedProvider] = useState<string>(provider);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [tmdbToken, setTmdbToken] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestSessionCode, setGuestSessionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [wasMadeAdmin, setWasMadeAdmin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qcCode, setQcCode] = useState<string | null>(null);
  const [qcSecret, setQcSecret] = useState<string | null>(null);

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

  useEffect(() => {
    if (sessionCodeParam) {
      setGuestSessionCode(sessionCodeParam);
    }
  }, [sessionCodeParam]);

  const copyToClipboard = async () => {
    if (qcCode) {
      await navigator.clipboard.writeText(qcCode);
      setCopied(true);
      toast.success("Code copied to clipboard", { position: 'top-right' });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const onAuthorized = useCallback((data?: any) => {
    if (data?.wasMadeAdmin) {
      setWasMadeAdmin(true);
      setLoading(false);
    } else {
      const callbackUrl = searchParams.get("callbackUrl") || `${basePath}/`;
      window.location.href = callbackUrl;
    }
  }, [searchParams, basePath]);

  useQuickConnectUpdates(qcSecret, onAuthorized);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const promise = async () => {
      const config: any = {};
      if (selectedProvider === "jellyfin" || selectedProvider === "plex") {
        if (serverUrl) config.serverUrl = serverUrl;
      } else if (selectedProvider === "tmdb") {
        if (tmdbToken) config.tmdbToken = tmdbToken;
      }

      const res = await apiClient.post("/api/auth/login", {
        username,
        password,
        provider: providerLock ? undefined : selectedProvider,
        config: providerLock ? undefined : config
      });
      return res.data;
    };

    toast.promise(promise(), {
      loading: selectedProvider !== "tmdb" ? "Logging in..." : "Initializing...",
      success: (data) => {
        if (data.wasMadeAdmin) {
          setWasMadeAdmin(true);
          setLoading(false);
          return "Admin account initialized";
        }
        const callbackUrl = searchParams.get("callbackUrl") || `${basePath}/`;
        window.location.href = callbackUrl;
        setLoading(false);
        return selectedProvider !== "tmdb" ? "Logged in successfully" : "Profile created";
      },
      error: (err) => {
        setLoading(false);
        return { message: "Login failed", description: getErrorMessage(err, "Check your credentials") };
      },
      position: 'top-right'
    });
  };

  const handleGuestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = sessionCodeParam || guestSessionCode;
    if (!guestName || !code) return;
    setLoading(true);

    const promise = async () => {
      const res = await apiClient.post("/api/auth/guest", { username: guestName, sessionCode: code });
      return res.data;
    };

    toast.promise(promise(), {
      loading: "Joining as guest...",
      success: (data) => {
        window.location.href = `${basePath}/`;
        return `Joined as ${data.user.Name}`;
      },
      error: (err) => {
        setLoading(false);
        return { message: "Failed to join as guest", description: getErrorMessage(err) };
      },
      position: 'top-right'
    });
  };

  const startQuickConnect = async () => {
    setLoading(true);

    const promise = async () => {
      const res = await apiClient.get("/api/auth/quick-connect", {
        params: { serverUrl: providerLock ? undefined : serverUrl }
      });
      const data = res.data;
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
      error: (err) => {
        setLoading(false);
        return { message: "Quick connect failed to initialize", description: getErrorMessage(err) };
      },
      position: 'top-right'
    });
  };

  const contentHeight = useMemo(() => {
    if (wasMadeAdmin) return "h-auto";
    if (selectedProvider === "tmdb") return !providerLock ? "h-[320px]" : "h-40";
    return !providerLock ? "h-[420px]" : "h-80";
  }, [wasMadeAdmin, selectedProvider, providerLock]);

  return (
    <Card className="w-full max-w-xs border-border bg-card text-card-foreground">
      <CardHeader>
        <Image src={logo} alt="Logo" className="size-16 mx-auto mb-2" loading="eager" />
        <CardTitle className="text-center text-2xl font-bold text-primary">
          Swiparr
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("transition-all duration-300", contentHeight)}>
        {wasMadeAdmin ? (
          <AdminInitializedView onContinue={() => {
            const callbackUrl = searchParams.get("callbackUrl") || `${basePath}/`;
            window.location.href = callbackUrl;
          }} />
        ) : (
          <div className="space-y-4">
            {!providerLock && (
              <Tabs value={selectedProvider} onValueChange={setSelectedProvider} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-9">
                  <TabsTrigger value="jellyfin" className="text-xs">
                    <SiJellyfin color="#00A4DC"/>
                    Jellyfin
                  </TabsTrigger>
                  <TabsTrigger value="plex" className="text-xs">
                    <SiPlex color="#e5a00d"/>
                    Plex
                  </TabsTrigger>
                  <TabsTrigger value="tmdb" className="text-xs">
                    <SiThemoviedatabase color="#01b4e4"/>
                    TMDB
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            {selectedProvider === "tmdb" ? (
              <TmdbView
                providerLock={providerLock}
                tmdbToken={tmdbToken}
                setTmdbToken={setTmdbToken}
                username={username}
                setUsername={setUsername}
                loading={loading}
                handleLogin={handleLogin}
              />
            ) : (
              <JellyfinPlexView
                provider={selectedProvider}
                providerLock={providerLock}
                serverUrl={serverUrl}
                setServerUrl={setServerUrl}
                username={username}
                setUsername={setUsername}
                password={password}
                setPassword={setPassword}
                guestName={guestName}
                setGuestName={setGuestName}
                guestSessionCode={guestSessionCode}
                setGuestSessionCode={setGuestSessionCode}
                loading={loading}
                handleLogin={handleLogin}
                handleGuestLogin={handleGuestLogin}
                startQuickConnect={startQuickConnect}
                qcCode={qcCode}
                copied={copied}
                copyToClipboard={copyToClipboard}
                setQcCode={setQcCode}
                sessionCodeParam={sessionCodeParam}
                hasQuickConnect={providerLock ? capabilities.hasQuickConnect : selectedProvider === "jellyfin"}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
