import "server-only";
import { config } from "@/lib/config";
import { ProviderType } from "@/lib/providers/types";
import { getRuntimeConfig, type RuntimeConfig } from "@/lib/runtime-config";
import { ConfigService } from "@/lib/services/config-service";

export async function getAsyncRuntimeConfig(): Promise<RuntimeConfig> {
  let provider: string | undefined;

  if (!config.app.providerLock) {
    provider = await ConfigService.getActiveProvider();
  } else {
    provider = config.app.provider;
  }

  return getRuntimeConfig({
    provider: provider as ProviderType,
  });
}

export async function getAsyncRuntimeConfigFromSession(): Promise<RuntimeConfig> {
  const { cookies } = await import("next/headers");
  const { getIronSession } = await import("iron-session");
  const { getSessionOptions } = await import("@/lib/session");

  const cookieStore = await cookies();
  const session = await getIronSession<any>(cookieStore, await getSessionOptions());

  let provider: string | undefined;

  if (session?.user?.provider) {
    provider = session.user.provider;
  } else {
    const base = await getAsyncRuntimeConfig();
    provider = base.provider;
  }

  return getRuntimeConfig({
    provider: provider as ProviderType,
  });
}
