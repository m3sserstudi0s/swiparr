"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentProps,
  type PropsWithChildren,
} from "react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";

/**
 * One tooltip for pointer and touch: hover shows a tooltip, a coarse pointer shows a popover on tap.
 * Types are derived from the app's own components, so this works on Radix and Base UI bases alike.
 */

type TooltipProps = ComponentProps<typeof Tooltip>;
type TooltipTriggerProps = ComponentProps<typeof TooltipTrigger>;
type TooltipContentProps = ComponentProps<typeof TooltipContent>;
type TooltipProviderProps = ComponentProps<typeof TooltipProvider>;
type PopoverProps = ComponentProps<typeof Popover>;
type PopoverTriggerProps = ComponentProps<typeof PopoverTrigger>;
type PopoverContentProps = ComponentProps<typeof PopoverContent>;

const TouchContext = createContext<boolean | undefined>(undefined);
const useTouch = () => useContext(TouchContext);

const TouchProvider = (props: PropsWithChildren) => {
  const [isTouch, setTouch] = useState<boolean>();

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    setTouch(mq.matches);
    // A tablet with a mouse plugged in changes its primary pointer; sampling once would lie.
    const onChange = (event: MediaQueryListEvent) => setTouch(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return <TouchContext.Provider value={isTouch} {...props} />;
};

const HybridTooltipProvider = (props: TooltipProviderProps) => {
  // Pass the app's provider props through: Radix takes delayDuration, Base UI takes delay/timeout.
  // Hardcoding either one makes the block base-specific.
  return <TooltipProvider {...props} />;
};

const HybridTooltip = (props: TooltipProps & PopoverProps) => {
  const isTouch = useTouch();
  return isTouch ? <Popover {...props} /> : <Tooltip {...props} />;
};

const HybridTooltipTrigger = (props: TooltipTriggerProps & PopoverTriggerProps) => {
  const isTouch = useTouch();
  return isTouch ? <PopoverTrigger {...props} /> : <TooltipTrigger {...props} />;
};

const HybridTooltipContent = (props: TooltipContentProps & PopoverContentProps) => {
  const isTouch = useTouch();
  return isTouch ? <PopoverContent {...props} /> : <TooltipContent {...props} />;
};

export {
  TouchProvider,
  HybridTooltipProvider,
  HybridTooltip,
  HybridTooltipTrigger,
  HybridTooltipContent,
};
