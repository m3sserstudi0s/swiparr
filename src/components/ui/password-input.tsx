"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"

interface PasswordInputProps extends React.ComponentProps<"input"> {
  inputClassName?: string
}

export function PasswordInput({
  className,
  inputClassName,
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  const toggleVisibility = () => {
    setIsVisible((prev) => !prev)
  }

  return (
    <InputGroup className={cn("bg-muted border-input", className)}>
      <InputGroupInput
        {...props}
        type={isVisible ? "text" : "password"}
        className={cn("bg-transparent h-full", inputClassName)}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          onClick={toggleVisibility}
          aria-label={isVisible ? "Hide password" : "Show password"}
          tabIndex={-1}
          className="text-muted-foreground/60 hover:text-foreground"
        >
          {isVisible ? (
            <EyeOff className="size-3.5" aria-hidden="true" />
          ) : (
            <Eye className="size-3.5" aria-hidden="true" />
          )}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
