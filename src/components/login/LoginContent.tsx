"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuickConnectUpdates } from "@/lib/use-updates";
import { usePlexPinAuth } from "@/hooks/usePlexPinAuth";
import Image from "next/image";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import logo from "../../../public/icon0.svg"
import { apiClient } from "@/lib/api-client";
import { cn, getErrorMessage } from "@/lib/utils";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { PROVIDER_CAPABILITIES, ProviderType } from "@/lib/providers/types";
import { createPlexPinClient, buildPlexAuthUrl } from "@/lib/plex/client-auth";

import { AdminInitializedView } from "./AdminInitializedView";
import { AuthView } from "./AuthView";
import { UniversalView } from "./UniversalView";
import { SiPlex, SiJellyfin, SiThemoviedatabase, SiEmby } from "react-icons/si";
import GradientText from "../ui/gradient-text";
import { SecureContextCopyFallback } from "../SecureContextCopyFallback";



export default function LoginContent() {
  const { capabilities: initialCapabilities, basePath, provider, providerLock } = useRuntimeConfig();

  const [selectedProvider, setSelectedProvider] = useState<string>(provider);

  const capabilities = useMemo(() => {
    if (providerLock) return initialCapabilities;
    return PROVIDER_CAPABILITIES[selectedProvider as ProviderType] || initialCapabilities;
  }, [selectedProvider, providerLock, initialCapabilities]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [tmdbToken, setTmdbToken] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestSessionCode, setGuestSessionCode] = useState("");
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [wasMadeAdmin, setWasMadeAdmin] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFallbackOpen, setIsFallbackOpen] = useState(false);
  const [qcCode, setQcCode] = useState<string | null>(null);
  const [qcSecret, setQcSecret] = useState<string | null>(null);
  const [plexPinId, setPlexPinId] = useState<number | null>(null);
  const [plexPinCode, setPlexPinCode] = useState<string | null>(null);
  const [plexAuthUrl, setPlexAuthUrl] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const reason = searchParams.get("reason");

    if (reason === "provider_mismatch") {
      toast.error("Provider mismatch", {
        description: "The server provider configuration has changed. You have been logged out.",
        duration: 5000,
      });

      // Remove `reason` from the URL after showing the toast
      const params = new URLSearchParams(searchParams.toString());
      params.delete("reason");

      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    }
  }, [searchParams, router]);

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

      // Fetch session provider to automatically switch to the correct UI
      apiClient.get(`/api/session/provider?code=${sessionCodeParam}`)
        .then(res => {
          if (res.data.provider) {
            setSelectedProvider(res.data.provider);
          }
        })
        .catch(err => {
          console.error("Failed to fetch session provider", err);
        });
    }
  }, [sessionCodeParam]);

  const [activeTab, setActiveTab] = useState<string>("login");

  useEffect(() => {
    if (sessionCodeParam) {
      setActiveTab("join");
    }
  }, [sessionCodeParam]);

  const copyToClipboard = async () => {
    if (qcCode) {
      if (!window.isSecureContext || !navigator.clipboard) {
        setIsFallbackOpen(true);
        return;
      }
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

  // Custom wrapper for usePlexPinAuth to handle 400 errors
  usePlexPinAuth(plexPinId, (data) => {
    // Stop polling if we got a successful auth
    setPlexPinId(null);
    onAuthorized(data);
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const isTmdbJoin = selectedProvider === "tmdb" && !!sessionCodeParam;

    const promise = async () => {
      if (isTmdbJoin) {
        const res = await apiClient.post("/api/auth/guest", {
          username,
          sessionCode: sessionCodeParam,
          profilePicture: profilePicture || undefined
        });
        return res.data;
      }

      const config: any = {};
      if (selectedProvider === ProviderType.JELLYFIN || selectedProvider === ProviderType.PLEX || selectedProvider === ProviderType.EMBY) {
        if (serverUrl) config.serverUrl = serverUrl;
      } else if (selectedProvider === "tmdb") {
        if (tmdbToken) config.tmdbToken = tmdbToken;
      }

      const res = await apiClient.post("/api/auth/login", {
        username,
        password,
        provider: providerLock ? undefined : selectedProvider,
        config: providerLock ? undefined : config,
        profilePicture: profilePicture || undefined
      });
      return res.data;

    };

    toast.promise(promise(), {
      loading: isTmdbJoin ? "Joining session..." : (selectedProvider !== "tmdb" ? "Logging in..." : "Initializing..."),
      success: (data) => {
        if (data.wasMadeAdmin) {
          setWasMadeAdmin(true);
          setLoading(false);
          return "Admin account initialized";
        }
        let callbackUrl = searchParams.get("callbackUrl");
        if (!callbackUrl) {
          callbackUrl = `${basePath}/`;
          if (sessionCodeParam && !isTmdbJoin) {
            callbackUrl += (callbackUrl.includes("?") ? "&" : "?") + `join=${sessionCodeParam}`;
          }
        }
        window.location.href = callbackUrl;
        setLoading(false);
        if (isTmdbJoin) return `Joined as ${data.user.Name}`;
        return selectedProvider !== "tmdb" ? "Logged in successfully" : "Profile created";
      },
      error: (err) => {
        setLoading(false);
        return { message: isTmdbJoin ? "Failed to join session" : "Login failed", description: getErrorMessage(err, isTmdbJoin ? undefined : "Check your credentials") };
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
      const res = await apiClient.post("/api/auth/guest", {
        username: guestName,
        sessionCode: code,
        profilePicture: profilePicture || undefined
      });
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

  const startPlexPinAuth = async () => {
    setLoading(true);

    const promise = async () => {
      const pinData = await createPlexPinClient();
      const authUrl = buildPlexAuthUrl(pinData.code);
      return {
        id: pinData.id,
        code: pinData.code,
        authUrl
      };
    };

    toast.promise(promise(), {
      loading: "Creating Plex PIN...",
      success: (data) => {
        setPlexPinId(data.id);
        setPlexPinCode(data.code);
        setPlexAuthUrl(data.authUrl);
        setLoading(false);
        return "Plex PIN created";
      },
      error: (err) => {
        setLoading(false);
        return { message: "Failed to create Plex PIN", description: getErrorMessage(err) };
      },
      position: 'top-right'
    });
  };

  return (
    <>
      <SecureContextCopyFallback
        open={isFallbackOpen}
        onOpenChange={setIsFallbackOpen}
        title="Quick Connect Code"
        value={qcCode || ""}
      />
      <Image src={logo} alt="Logo" className="size-16 dark:invert dark:opacity-90 opacity-75 absolute top-16" loading="eager" />
      <Card className={cn("w-full border-border bg-card text-card-foreground pt-8", !providerLock ? "max-w-sm" : "max-w-xs")}>
        <CardContent className={cn("transition-all duration-300 h-auto", !providerLock && "px-5")}>
          {wasMadeAdmin ? (
            <AdminInitializedView onContinue={() => {
              const callbackUrl = searchParams.get("callbackUrl") || `${basePath}/`;
              window.location.href = callbackUrl;
            }} />
          ) : (
            <div className="space-y-4">
              {!providerLock && (
                <Tabs value={selectedProvider} onValueChange={setSelectedProvider} className="w-full">
                  <TabsList className="grid w-full grid-cols-4 h-9">
                    <TabsTrigger value="jellyfin" className="text-xs font-semibold">
                      <SiJellyfin />
                      Jellyfin
                    </TabsTrigger>
                    <TabsTrigger value="emby" className="text-xs font-semibold">
                      <SiEmby />
                      Emby
                    </TabsTrigger>
                    <TabsTrigger value="plex" className="text-xs font-semibold">
                      <SiPlex />
                      Plex
                    </TabsTrigger>
                    <TabsTrigger value="tmdb" className="text-xs font-semibold">
                      <SiThemoviedatabase />
                      TMDB
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}

              {selectedProvider === "tmdb" ? (
                <UniversalView
                  providerLock={providerLock}
                  tmdbToken={tmdbToken}
                  setTmdbToken={setTmdbToken}
                  username={username}
                  setUsername={setUsername}
                  loading={loading}
                  handleLogin={handleLogin}
                  isJoining={!!sessionCodeParam}
                  onProfilePictureChange={setProfilePicture}
                />
              ) : (
                <AuthView
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
                  hasQuickConnect={capabilities.hasQuickConnect}
                  isExperimental={providerLock ? capabilities.isExperimental : selectedProvider === ProviderType.EMBY}
                  onProfilePictureChange={setProfilePicture}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  startPlexPinAuth={startPlexPinAuth}
                  plexPinCode={plexPinCode}
                  setPlexPinCode={setPlexPinCode}
                  plexAuthUrl={plexAuthUrl}
                />
              )}

            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}

