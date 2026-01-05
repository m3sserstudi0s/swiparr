"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "./ui/tooltip";
import { MovieDetailProvider } from "./movie/MovieDetailProvider";
import { Toaster } from "@/components/ui/sonner"
import { useUpdates } from "@/lib/use-updates";
import axios from "axios";
import { useRuntimeConfig } from "@/lib/runtime-config";

function UpdatesSubscriber() {
  useUpdates();
  return null;
}

export function Providers({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const config = useRuntimeConfig();
  const [queryClient] = React.useState(() => new QueryClient());

  React.useMemo(() => {
    if (config.basePath) {
      axios.defaults.baseURL = config.basePath;
    }
  }, [config.basePath]);

  return (
    <QueryClientProvider client={queryClient}>
      <NextThemesProvider {...props}>
        <TooltipProvider>
          <MovieDetailProvider>
            <Toaster position='bottom-right'/>
            <UpdatesSubscriber />
            {children}
          </MovieDetailProvider>
        </TooltipProvider>
      </NextThemesProvider>
    </QueryClientProvider>
  )
}
