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
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Manual copy required</AlertTitle>
            <AlertDescription className="text-xs">
              Automatic copy and sharing is disabled because Swiparr is not running in a secure context (HTTPS).
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <Label htmlFor="manual-copy">Copy this text</Label>
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
