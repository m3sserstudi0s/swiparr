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

  // High-res version for the main image
  const optimizedSrc = typeof src === "string" && src.startsWith("/api/jellyfin/image")
    ? `${src}${src.includes("?") ? "&" : "?"}${width ? `width=${width}` : "width=1200"}${height ? `&height=${height}` : ""}&quality=80`
    : src;

  // Tiny version to use as a blur placeholder
  const blurSrc = typeof src === "string" && src.startsWith("/api/jellyfin/image")
    ? `${src}${src.includes("?") ? "&" : "?"}width=40&quality=10`
    : null;

  return (
    <div 
      className={cn("relative overflow-hidden bg-muted/20", containerClassName || className)}
    >
      {/* Real-image blur placeholder */}
      {blurSrc && isLoading && (
        <img 
          src={blurSrc} 
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-50"
        />
      )}
      
      {/* Loading Skeleton fallback if no blurSrc */}
      {isLoading && !blurSrc && (
        <Skeleton className="absolute inset-0" />
      )}

      <Image
        {...props}
        src={optimizedSrc}
        alt={alt}
        width={isFill ? undefined : width}
        height={isFill ? undefined : height}
        fill={isFill}
        priority={priority}
        unoptimized // Required: Next.js optimizer cannot pass user session cookies to internal API routes
        className={cn(
          "transition-all duration-700 ease-in-out",
          isLoading ? "opacity-0 scale-102" : "opacity-100 scale-100",
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
