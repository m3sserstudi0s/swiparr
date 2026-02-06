import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { ProfilePicturePicker } from "../profile/ProfilePicturePicker";

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
            ? "Enter a display name to join the session"
            : (providerLock
              ? "Enter a name to start swiping"
              : "Configure TMDB and enter a name")}
        </CardDescription>

        {!providerLock && !isJoining && (

          <PasswordInput
            placeholder="TMDB API Read Access Token"
            value={tmdbToken}
            onChange={(e) => setTmdbToken(e.target.value)}
            className="h-8"
            inputClassName="text-xs"
          />
        )}

        <Input
          placeholder="Display name"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="bg-muted border-input"
          autoFocus
        />
        <Button type="submit" className="w-full font-semibold mt-4" disabled={loading || !username}>
          {loading ? (isJoining ? "Joining..." : "Starting...") : (isJoining ? "Join" : "Start")}
        </Button>
      </form>
    </div>
  );
}
