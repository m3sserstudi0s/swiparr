import React from "react";
import * as Flags from "country-flag-icons/react/3x2";
import { cn } from "@/lib/utils";

interface CountryFlagProps {
  countryCode: string;
  className?: string;
}

export const CountryFlag = ({ countryCode, className }: CountryFlagProps) => {
  const Flag = (Flags as any)[countryCode.toUpperCase()];
  if (!Flag) return null;
  return <Flag className={cn("size-full", className)} />;
};
