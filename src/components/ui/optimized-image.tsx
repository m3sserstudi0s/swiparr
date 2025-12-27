"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

export function OptimizedImage({ className, containerClassName, ...props }: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={cn("relative overflow-hidden", containerClassName || className)}>
      {isLoading && (
        <Skeleton 
          className="absolute inset-0" 
        />
      )}
      <img
        {...props}
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={(e) => {
          setIsLoading(false)
          props.onLoad?.(e);
        }}
      />
    </div>
  );
}
