import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function DeckLoading() {
  return (
    <div className="relative flex flex-col items-center justify-center w-full">
      <div className="h-8.75" />
      <div className="relative w-full h-[68svh] flex justify-center items-center">
        <Skeleton className="relative w-full h-full rounded-3xl" />
      </div>
      <div className="flex space-x-6 mt-4 items-center">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-18 w-18 rounded-full" />
        <Skeleton className="h-18 w-18 rounded-full" />
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    </div>
  );
}
