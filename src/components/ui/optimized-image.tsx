"use client";

import { useState, useEffect } from "react"; // Added useEffect
import Image, { ImageLoaderProps, ImageProps } from "next/image";
import { cn } from "@/lib/utils";
import { useRuntimeConfig } from "@/lib/runtime-config";
import { useBlurData } from "@/hooks/use-blur-data";
import { Image as ImageIcon } from "lucide-react";

import { Skeleton } from "./skeleton";

// 1. Create a global set to track loaded images outside the component
const loadedImageCache = new Set<string>();

interface OptimizedImageProps extends Omit<ImageProps, "onLoad"> {
  containerClassName?: string;
  onLoad?: (e: any) => void;
  externalId?: string;
  imageType?: string;
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
  placeholder,
  blurDataURL: initialBlurDataURL,
  externalId,
  imageType,
  ...props
}: OptimizedImageProps) {
  const { basePath } = useRuntimeConfig();

  // Helper to get string version of src
  const srcString = typeof src === "string" ? src : "";
  const resolvedSrc = srcString.startsWith("/") && !srcString.startsWith(basePath)
    ? `${basePath}${srcString}`
    : src;

  // 2. Initialize state based on whether the image is in our global cache
  const cacheKey = typeof resolvedSrc === "string" ? resolvedSrc : "";
  const [isLoading, setIsLoading] = useState(!loadedImageCache.has(cacheKey));
  const [hasError, setHasError] = useState(false);

  const isFill = fill ?? (!width && !height);
  const isMediaImage = !!externalId || (typeof src === "string" && (src.startsWith("/api/media/image") || src.startsWith(`${basePath}/api/media/image`)));

  const blurDataURL = useBlurData(externalId, initialBlurDataURL, imageType);

  const imageLoader = ({ src, width, quality }: ImageLoaderProps) => {
    return `${src}${src.includes("?") ? "&" : "?"}width=${width}&quality=${quality || 75}`;
  };

  const handleLoad = (e: any) => {
    // 4. Add to cache once loaded
    if (cacheKey) {
      loadedImageCache.add(cacheKey);
    }
    setIsLoading(false);
    onLoad?.(e);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  return (
    <div className={cn("relative overflow-hidden bg-muted/20", containerClassName || className)}>
      {!hasError && (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-400",
            isLoading ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {blurDataURL ? (
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl scale-102"
              style={{ backgroundImage: `url(${blurDataURL})` }}
            />
          ) : (
            <Skeleton className="w-full h-full" />
          )}
        </div>
      )}

      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
        </div>
      ) : (
        <Image
          {...props}
          loader={isMediaImage ? imageLoader : undefined}
          src={resolvedSrc}
          alt={alt}
          width={isFill ? undefined : width}
          height={isFill ? undefined : height}
          fill={isFill}
          priority={priority}
          className={cn(
            "duration-400 ease-in-out transition-all",
            isLoading ? "opacity-0 scale-102" : "opacity-100 scale-100",
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}