"use client";

import { useState } from "react";
import Image, { ImageLoaderProps, ImageProps } from "next/image";
import { cn } from "@/lib/utils";
import { useRuntimeConfig } from "@/lib/runtime-config";
import useSWR from "swr";
import { apiClient } from "@/lib/api-client";
import { Skeleton } from "./skeleton";

interface OptimizedImageProps extends Omit<ImageProps, "onLoad"> {
  containerClassName?: string;
  onLoad?: (e: any) => void;
  jellyfinItemId?: string;
  jellyfinImageType?: string;
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
  jellyfinItemId,
  jellyfinImageType,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const { basePath } = useRuntimeConfig();

  const isFill = fill ?? (!width && !height);
  const isJellyfinImage = !!jellyfinItemId || (typeof src === "string" && (src.startsWith("/api/jellyfin/image") || src.startsWith(`${basePath}/api/jellyfin/image`)));

  const { data: blurData } = useSWR(
    isJellyfinImage && !initialBlurDataURL && jellyfinItemId
      ? `/api/jellyfin/image/${jellyfinItemId}/blur${jellyfinImageType ? `?imageType=${jellyfinImageType}` : ""}`
      : null,
    (url: string) => apiClient.get(url).then(res => res.data.blurDataURL),
    { revalidateOnFocus: false }
  );

  const blurDataURL = initialBlurDataURL || blurData;

  const resolvedSrc = typeof src === "string" && src.startsWith("/") && !src.startsWith(basePath)
    ? `${basePath}${src}`
    : src;

  const imageLoader = ({ src, width, quality }: ImageLoaderProps) => {
    return `${src}${src.includes("?") ? "&" : "?"}width=${width}&quality=${quality || 75}`;
  }

  // Use blur placeholder if blurDataURL is provided, or if specifically requested
  const resolvedPlaceholder = blurDataURL ? "blur" : placeholder;

  return (
    <div
      className={cn("relative overflow-hidden bg-muted/20", containerClassName || className)}
    >
      {isLoading && !blurDataURL ?
        <Skeleton className="w-full h-full"/>
        : <Image
          {...props}
          loader={isJellyfinImage ? imageLoader : undefined}
          src={resolvedSrc}
          alt={alt}
          width={isFill ? undefined : width}
          height={isFill ? undefined : height}
          fill={isFill}
          priority={priority}
          placeholder={resolvedPlaceholder}
          blurDataURL={blurDataURL}
          className={cn(
            "duration-700 ease-in-out transition-transform",
            isLoading ? "scale-102" : "scale-100",
            className
          )}
          onLoad={(e) => {
            setIsLoading(false);
            onLoad?.(e);
          }}
        />
      }
    </div>
  );
}
