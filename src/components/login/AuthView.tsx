import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";

import { Label } from "@/components/ui/label";
import { CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangleIcon } from "lucide-react"
import { ProviderType } from "@/lib/providers/types";
import { ProfilePicturePicker } from "../profile/ProfilePicturePicker";
import { ExternalLink, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

interface AuthCodeViewProps {
  code: string;
  copied: boolean;
  onCopy: () => void;
  onCancel: () => void;
  variant: "quick-connect" | "plex-pin";
  authUrl?: string;
}

const truncatePlexPin = (pin: string): string => {
  if (pin.length <= 4) {
    return pin;
  }

  return `${pin.slice(0, 5)}...${pin.slice(-5)}`;
};

function AuthCodeView({ code, copied, onCopy, onCancel, variant, authUrl }: AuthCodeViewProps) {
  const t = useTranslations('AuthSession');
  const tUI = useTranslations('UI');
  const isPlex = variant === "plex-pin";
  const displayCode = isPlex ? truncatePlexPin(code) : code;

  return (
    <div className="flex flex-col items-center space-y-6 py-4">
      <div className="relative group">
        <div className={cn("flex flex-row items-center text-primary font-mono bg-muted p-4 rounded-lg border border-primary/20", isPlex ? 'text-xl tracking-[0.15em] font-bold' : 'text-3xl tracking-[0.5em] font-black')}>
          {displayCode}
          <Button
            variant="outline"
            size="icon"
            className="ml-2"
            onClick={onCopy}
            title={tUI('copyToClip')}
          >
            {copied ? (
              <Check className="h-4 w-4 " />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      {isPlex && authUrl && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(authUrl, "_blank")}
          className="gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          {t('openPlex')}
        </Button>
      )}
      <p className="text-xs text-center text-muted-foreground max-w-[280px]">
        {isPlex ? (
          t.rich('plexPinMsg', {
            link: (children) => (
              <a
                href={authUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground font-semibold hover:underline"
              >
                {children}
              </a>
            )
          })
        ) : (
          t.rich('quickConnectMsg', {
            bold: (children) => <span className="text-foreground font-semibold">{children}</span>
          })
        )}
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="text-muted-foreground hover:text-foreground"
      >
        {tUI('cancelBtn')}
      </Button>
    </div>
  );
}

interface AuthViewProps {
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
  onProfilePictureChange?: (base64: string | null) => void;
  activeTab: string,
  setActiveTab: (activeTab: string) => void;
  startPlexPinAuth?: () => void;
  plexPinCode?: string | null;
  setPlexPinCode?: (val: string | null) => void;
  plexAuthUrl?: string | null;
}


export function AuthView({
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
  isExperimental,
  onProfilePictureChange,
  activeTab,
  setActiveTab,
  startPlexPinAuth,
  plexPinCode,
  setPlexPinCode,
  plexAuthUrl,
}: AuthViewProps) {

  const providerName = provider[0].toUpperCase() + provider.substring(1);
  const isPlex = provider === ProviderType.PLEX;
  const [pinCopied, setPinCopied] = useState(false);
  const t = useTranslations('AuthSession');
  const tUI = useTranslations('UI');

  const handlePinCopy = () => {
    if (plexPinCode) {
      navigator.clipboard.writeText(plexPinCode);
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    }
  };

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="login">{t('tabLogin')}</TabsTrigger>
        <TabsTrigger value="join">{tUI('guestTab')}</TabsTrigger>
      </TabsList>
      <TabsContent value="login" className="space-y-4">
        {qcCode ? (
          <AuthCodeView
            code={qcCode}
            copied={copied}
            onCopy={copyToClipboard}
            onCancel={() => setQcCode(null)}
            variant="quick-connect"
          />
        ) : plexPinCode && plexAuthUrl && isPlex ? (
          <AuthCodeView
            code={plexPinCode}
            authUrl={plexAuthUrl}
            copied={pinCopied}
            onCopy={handlePinCopy}
            onCancel={() => setPlexPinCode?.(null)}
            variant="plex-pin"
          />
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <CardDescription>
              {isPlex
                ? t('plexProviderPrompt')
                : t('genericProviderPrompt', { provider: providerName })
              }
            </CardDescription>

            {!providerLock && (
              <Input
                placeholder={
                  provider === ProviderType.JELLYFIN
                    ? t('jellyfinUrl')
                    : provider === ProviderType.EMBY
                      ? t('embyUrl')
                      : t('plexUrl')
                }
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                className="bg-muted border-input text-xs h-8"
              />
            )}

            {isPlex ? (
              <>
                <Button
                  type="button"
                  className="w-full mt-2 font-semibold"
                  onClick={startPlexPinAuth}
                  disabled={loading}
                >
                  {loading ? t('creatingPin') : t('signInPin')}
                </Button>
              </>
            ) : (
              <>
                <Input
                  placeholder={t('username')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-muted border-input"
                />
                <PasswordInput
                  placeholder={t('password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <Button type="submit" className="w-full mt-2 font-semibold" disabled={loading}>
                  {loading ? t('connecting') : t('tabLogin')}
                </Button>
              </>
            )}

            {hasQuickConnect && !isPlex && (
              <>
                <div className="relative py-1">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase">
                    <span className="bg-card px-2 text-muted-foreground">{t('or')}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full hover:bg-accent h-9 font-semibold"
                  onClick={startQuickConnect}
                  disabled={loading}
                >
                  {t('quickConnect')}
                </Button>
              </>
            )}
            {isExperimental && (
              <Alert className="max-w-full mt-2 ">
                <AlertTriangleIcon className="text-amber-600!" />
                <AlertTitle className="whitespace-nowrap">{t('experimentalTitle')}</AlertTitle>
                <AlertDescription className="text-xs">
                  {t('experimentalDesc')}
                </AlertDescription>
              </Alert>
            )}
          </form>
        )}
      </TabsContent>
      <TabsContent value="join" className="space-y-5">
        <form onSubmit={handleGuestLogin} className="space-y-3">
          <div className="flex justify-center pb-2">
            <ProfilePicturePicker
              userName={guestName || "G"}
              onImageSelected={onProfilePictureChange}
            />
          </div>
          <CardDescription>{!sessionCodeParam ? t('guestPromptWithCode') : t('guestPromptNoCode')}</CardDescription>
          <Input

            placeholder={tUI('displayNamePlaceholder')}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="bg-muted border-input"
            autoFocus
          />
          {!sessionCodeParam && (
            <>
              <Label htmlFor="session-code" className="mt-1 mb-2 text-muted-foreground">
                {" "}
                {tUI('sessionCode')}
              </Label>
              <Input
                id="session-code"
                value={guestSessionCode}
                placeholder={t('sessionCodePlaceholder')}
                onChange={(e) => setGuestSessionCode(e.target.value.toUpperCase())}
                className="bg-muted border-input font-mono tracking-widest uppercase"
                maxLength={4}
              />
            </>
          )}
          <div className="pt-1.5">
            <Button
              type="submit"
              className="w-full font-semibold"
              disabled={loading || !guestName || !guestSessionCode}
            >
              {loading ? tUI('joining') : tUI('joinBtn')}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground pt-1">
            {t('guestJoinLogMode')}
          </p>
        </form>
      </TabsContent>
    </Tabs>
  );
}
