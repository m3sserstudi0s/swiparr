"use client";

import { createContext, useContext, useState } from "react";

interface RequestedMediaContextValue {
  requested: Set<string>;
  markRequested: (itemId: string) => void;
}

const RequestedMediaContext = createContext<RequestedMediaContextValue | null>(null);

export function RequestedMediaProvider({ children }: { children: React.ReactNode }) {
  const [requested, setRequested] = useState<Set<string>>(new Set());

  const markRequested = (itemId: string) => {
    setRequested((prev) => new Set(prev).add(itemId));
  };

  return (
    <RequestedMediaContext.Provider value={{ requested, markRequested }}>
      {children}
    </RequestedMediaContext.Provider>
  );
}

export function useRequestedMedia() {
  const ctx = useContext(RequestedMediaContext);
  if (!ctx) throw new Error("useRequestedMedia must be used within RequestedMediaProvider");
  return ctx;
}
