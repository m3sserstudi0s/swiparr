"use client";
import { useState } from "react";
import { toast } from "sonner";

export function useRequestMedia() {
  const [requesting, setRequesting] = useState<string | null>(null);
  const [requested, setRequested] = useState<Set<string>>(new Set());

  const request = async (itemId: string, itemName: string) => {
    if (requested.has(itemId) || requesting === itemId) return;
    setRequesting(itemId);
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, itemName }),
      });
      if (res.ok) {
        setRequested((prev) => new Set(prev).add(itemId));
        toast.success(`"${itemName}" submitted — pending admin approval`);
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Failed to send request");
      }
    } catch {
      toast.error("Failed to contact server");
    } finally {
      setRequesting(null);
    }
  };

  return { request, requesting, requested };
}
