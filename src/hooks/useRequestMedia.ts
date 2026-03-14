"use client";
import { useState } from "react";
import { toast } from "sonner";
import { useRequestedMedia } from "@/components/RequestedMediaProvider";

export function useRequestMedia() {
  const [requesting, setRequesting] = useState<string | null>(null);
  const { requested, markRequested } = useRequestedMedia();

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
        markRequested(itemId);
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
