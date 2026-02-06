"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface SecureContextCopyFallbackProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  value: string;
}

export function SecureContextCopyFallback({
  open,
  onOpenChange,
  title,
  value,
}: SecureContextCopyFallbackProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Automatic copy and sharing is disabled because Swiparr is not running in a secure context (HTTPS).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Action Required</AlertTitle>
            <AlertDescription>
              Please manually select and copy the text below.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="manual-copy">Copy this value</Label>
            <Input
              id="manual-copy"
              value={value}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="font-mono text-center"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
