import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";

import { CardDescription } from "@/components/ui/card";

interface UniversalViewProps {
  providerLock: boolean;
  tmdbToken: string;
  setTmdbToken: (val: string) => void;
  username: string;
  setUsername: (val: string) => void;
  loading: boolean;
  handleLogin: (e: React.FormEvent) => void;
}

export function UniversalView({
  providerLock,
  tmdbToken,
  setTmdbToken,
  username,
  setUsername,
  loading,
  handleLogin,
}: UniversalViewProps) {
  return (
    <div className="space-y-4">
      <CardDescription>
        {providerLock
          ? "Enter a name to start swiping"
          : "Configure TMDB and enter a name"}
      </CardDescription>
      <form onSubmit={handleLogin} className="space-y-4">
        {!providerLock && (
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
        <Button type="submit" className="w-full font-semibold" disabled={loading || !username}>
          {loading ? "Starting..." : "Start"}
        </Button>
      </form>
    </div>
  );
}
