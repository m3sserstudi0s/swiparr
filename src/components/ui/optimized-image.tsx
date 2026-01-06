"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useRuntimeConfig } from "@/lib/runtime-config";

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
  const { basePath } = useRuntimeConfig();

  const isFill = fill ?? (!width && !height);
  const isJellyfinImage = typeof src === "string" && (src.startsWith("/api/jellyfin/image") || src.startsWith(`${basePath}/api/jellyfin/image`));

  const resolvedSrc = typeof src === "string" && src.startsWith("/") && !src.startsWith(basePath) 
    ? `${basePath}${src}` 
    : src;

  return (
    <div 
      className={cn("relative overflow-hidden bg-muted/20", containerClassName || className)}
    >
      {/* Real-image blur placeholder */}
      {isJellyfinImage && isLoading && (
        <img 
          src={`${resolvedSrc}${resolvedSrc.toString().includes("?") ? "&" : "?"}width=40&quality=10`} 
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-50"
        />
      )}
      
      {/* Loading Skeleton fallback if no blurSrc */}
      {isLoading && !isJellyfinImage && (
        <Skeleton className="absolute inset-0" />
      )}

      <Image
        {...props}
        loader={isJellyfinImage ? ({ src, width, quality }) => {
          return `${src}${src.includes("?") ? "&" : "?"}width=${width}&quality=${quality || 80}`;
        } : undefined}
        src={resolvedSrc}
        alt={alt}
        width={isFill ? undefined : width}
        height={isFill ? undefined : height}
        fill={isFill}
        priority={priority}
        className={cn(
          "transition-all duration-700 ease-in-out",
          isLoading ? "scale-102" : "scale-100",
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
