"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HybridTooltipProvider } from "./ui/hybrid-tooltip";
import { MovieDetailProvider } from "./movie/MovieDetailProvider";
import { RequestedMediaProvider } from "./RequestedMediaProvider";

import { Toaster } from "@/components/ui/sonner"
import { useUpdates } from "@/lib/use-updates";

function UpdatesSubscriber() {
  useUpdates();
  return null;
}

export function Providers({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider {...props}>
        <HybridTooltipProvider>
          <RequestedMediaProvider>
            <MovieDetailProvider>
              <Toaster position='bottom-right' toastOptions={{className: "mt-[env(safe-area-inset-top)] mb-[env(safe-area-inset-bottom)]"}}/>
              <UpdatesSubscriber />
              {children}
            </MovieDetailProvider>
          </RequestedMediaProvider>
        </HybridTooltipProvider>
      </NextThemesProvider>

    </QueryClientProvider>
  )
}
