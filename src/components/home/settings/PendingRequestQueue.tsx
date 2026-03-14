"use client";

import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { getErrorMessage } from "@/lib/utils";
import { usePendingRequests, useApproveRequest, useDenyRequest } from "@/hooks/api";

export function PendingRequestQueue() {
  const { data: requests = [], isLoading } = usePendingRequests();
  const approveMutation = useApproveRequest();
  const denyMutation = useDenyRequest();

  const handleApprove = (id: number, name: string | null) => {
    toast.promise(approveMutation.mutateAsync(id), {
      loading: "Approving request...",
      success: `"${name ?? "Item"}" approved`,
      error: (err) => ({
        message: "Failed to approve request",
        description: getErrorMessage(err),
      }),
    });
  };

  const handleDeny = (id: number, name: string | null) => {
    toast.promise(denyMutation.mutateAsync(id), {
      loading: "Denying request...",
      success: `"${name ?? "Item"}" denied`,
      error: (err) => ({
        message: "Failed to deny request",
        description: getErrorMessage(err),
      }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Empty className="border py-6">
        <EmptyHeader>
          <EmptyTitle className="text-sm">No pending requests</EmptyTitle>
          <EmptyDescription>Requests submitted by users will appear here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-2">
      {requests.map((req) => (
        <div
          key={req.id}
          className="flex flex-col gap-2 rounded-md border p-3 text-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <div className="font-medium">{req.itemName ?? req.itemId}</div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-1 py-0.5 uppercase tracking-wider text-[10px]">
                  {req.mediaType === "tv" ? "TV" : "Movie"}
                </span>
                <span>by {req.requestedByName ?? req.requestedBy}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => handleApprove(req.id, req.itemName ?? null)}
              disabled={approveMutation.isPending || denyMutation.isPending}
            >
              Approve
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => handleDeny(req.id, req.itemName ?? null)}
              disabled={approveMutation.isPending || denyMutation.isPending}
            >
              Deny
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
