import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { ProfilePicturePicker } from "../profile/ProfilePicturePicker";
import { useTranslations } from "next-intl";

interface UniversalViewProps {
  providerLock: boolean;
  tmdbToken: string;
  setTmdbToken: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  loading: boolean;
  handleLogin: (e: React.FormEvent) => void;
  isJoining?: boolean;
  onProfilePictureChange?: (base64: string | null) => void;
}

export function UniversalView({
  providerLock,
  tmdbToken,
  setTmdbToken,
  username,
  setUsername,
  loading,
  handleLogin,
  isJoining,
  onProfilePictureChange,
}: UniversalViewProps) {
  const t = useTranslations('LoginUniversal');
  const tUI = useTranslations('UI');

  return (
    <div className="space-y-2">
      <form onSubmit={handleLogin} className="space-y-2">
        <div className="flex justify-center pb-2">
          <ProfilePicturePicker
            userName={username || "U"}
            onImageSelected={onProfilePictureChange}
          />
        </div>

        <CardDescription>
          {isJoining
            ? t('joinPrompt')
            : (providerLock
              ? t('startPrompt')
              : t('tmdbPrompt'))}
        </CardDescription>

        {!providerLock && !isJoining && (

          <PasswordInput
            placeholder={t('tmdbTokenPlaceholder')}
            value={tmdbToken}
            onChange={(e) => setTmdbToken(e.target.value)}
            className="h-8"
            inputClassName="text-xs"
          />
        )}

        <Input
          placeholder={tUI('displayNamePlaceholder')}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="bg-muted border-input"
          autoFocus
        />
        <Button type="submit" className="w-full font-semibold mt-4" disabled={loading || !username}>
          {loading ? (isJoining ? tUI('joining') : t('starting')) : (isJoining ? tUI('joinBtn') : t('start'))}
        </Button>
      </form>
    </div>
  );
}
