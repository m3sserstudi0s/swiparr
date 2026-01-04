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
  // Check for both Jellyfin and Plex image API routes
  const isMediaServerImage = typeof src === "string" && 
    (src.startsWith("/api/jellyfin/image") || src.startsWith("/api/plex/image"));

  return (
    <div 
      className={cn("relative overflow-hidden bg-muted/20", containerClassName || className)}
    >
      {/* Real-image blur placeholder */}
      {isMediaServerImage && isLoading && (
        <img 
          src={`${src}${src.includes("?") ? "&" : "?"}width=40&quality=10`} 
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 opacity-50"
        />
      )}
      
      {/* Loading Skeleton fallback if no blurSrc */}
      {isLoading && !isMediaServerImage && (
        <Skeleton className="absolute inset-0" />
      )}

      <Image
        {...props}
        loader={isMediaServerImage ? ({ src, width, quality }) => {
          return `${src}${src.includes("?") ? "&" : "?"}width=${width}&quality=${quality || 80}`;
        } : undefined}
        src={src}
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
