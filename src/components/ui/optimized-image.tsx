"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<ImageProps, "onLoad"> {
  containerClassName?: string;
  onLoad?: (e: any) => void;
}

export function OptimizedImage({ 
  className, 
  containerClassName, 
  src, 
  alt = "", 
  width, 
  height, 
  fill,
  priority,
  onLoad,
  ...props 
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  const isFill = fill ?? (!width && !height);

  return (
    <div className={cn("relative overflow-hidden", containerClassName || className)}>
      {isLoading && (
        <Skeleton 
          className="absolute inset-0" 
        />
      )}
      <Image
        {...props}
        src={src}
        alt={alt}
        width={isFill ? undefined : width}
        height={isFill ? undefined : height}
        fill={isFill}
        priority={priority}
        unoptimized
        className={cn(
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100",
          className
        )}
        onLoad={(e) => {
          setIsLoading(false);
          onLoad?.(e);
        }}
      />
    </div>
  );
}
