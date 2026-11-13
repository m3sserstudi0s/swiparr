"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The canon switch (messer-ui `recipes.css` → `.m-switch`), not a Radix rebuild of it.
 *
 * A native checkbox with the recipe's own pseudo-element knob means the settings drawer, the
 * filter drawer and the sink all render the identical control — the two implementations that
 * existed before drifted in height, knob size and margins, which is what made one look off-centre
 * next to the other.
 */
export interface SwitchProps
  extends Omit<React.ComponentProps<"input">, "type" | "onChange" | "size" | "checked"> {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

function Switch({ className, checked, defaultChecked, onCheckedChange, disabled, ...props }: SwitchProps) {
  return (
    <input
      type="checkbox"
      role="switch"
      data-slot="switch"
      className={cn("m-switch", className)}
      // Uncontrolled callers pass `defaultChecked`, controlled ones `checked`; handing React
      // `checked={undefined}` would make it warn about switching between the two modes.
      {...(checked === undefined ? { defaultChecked } : { checked })}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.currentTarget.checked)}
      {...props}
    />
  )
}

export { Switch }
