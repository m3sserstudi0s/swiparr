"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "./ui/tooltip";
import { MovieDetailProvider } from "./movie/MovieDetailProvider";
import { Toaster } from "@/components/ui/sonner"
import { useUpdates } from "@/lib/use-updates";
import axios from "axios";

// Set up global axios interceptor for 401 handling
if (typeof window !== "undefined") {
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        const data = error.response?.data;
        // If server indicates session expired, redirect to login
        if (data?.redirect || data?.error?.includes("expired") || data?.error?.includes("Session")) {
          window.location.href = "/login";
          return new Promise(() => {}); // Prevent further error handling
        }
      }
      return Promise.reject(error);
    }
  );
}

function UpdatesSubscriber() {
  useUpdates();
  return null;
}

export function Providers({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error: any) => {
          // Don't retry on 401 errors
          if (error?.response?.status === 401) return false;
          return failureCount < 3;
        },
      },
    },
  }));
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
