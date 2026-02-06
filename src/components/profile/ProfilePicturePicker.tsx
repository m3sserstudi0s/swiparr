"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X, Plus, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProfilePicturePickerProps {
    currentImage?: string; // URL
    hasCustomImage?: boolean;
    onImageSelected?: (base64: string | null) => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg'
    userName?: string;
    editable?: boolean;
    onUpload?: (file: File) => Promise<void>;
    onDelete?: () => Promise<void>;
}

export function ProfilePicturePicker({
    currentImage,
    hasCustomImage,
    onImageSelected,
    className,
    size = 'lg',
    editable = true,
    onUpload,
    onDelete
}: ProfilePicturePickerProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [removed, setRemoved] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset removed state when props change (e.g. after a successful delete/upload)
    useEffect(() => {
        setRemoved(false);
        setImageLoaded(false);
    }, [currentImage, hasCustomImage]);

    // If we have a preview, we definitely have an image.
    // If we don't have a preview, we check if we have a custom image (from DB) or a currentImage (like provider one)
    // and that it hasn't been removed. We also wait for it to load if we don't have hasCustomImage.
    // Actually, if we have hasCustomImage, we know it exists.
    const hasImage = !!preview || ((hasCustomImage || !!currentImage) && !removed);
    const actuallyShowingImage = !!preview || (hasImage && imageLoaded);

    const showRemoveButton = (actuallyShowingImage || hasCustomImage) && !removed;
    const showDashedBorder = !actuallyShowingImage;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be smaller than 5MB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setPreview(base64);
            setRemoved(false);
            if (onImageSelected) {
                onImageSelected(base64);
            }
            
            if (onUpload) {
                setIsUploading(true);
                try {
                    await onUpload(file);
                } catch (error) {
                    toast.error("Failed to upload profile picture");
                    setPreview(null);
                } finally {
                    setIsUploading(false);
                }
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemove = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        // If we were showing a preview of a newly selected file, just clear it
        if (preview) {
            setPreview(null);
            if (onImageSelected) {
                onImageSelected(null);
            }
        } else {
            // If we were showing the current/custom image, mark it as removed
            setRemoved(true);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        // Only call onDelete if we are actually deleting a persisted image (custom one)
        // If we have a preview, we might have ALREADY uploaded it (in AccountSettings)
        // so we should call onDelete if hasCustomImage is true OR if we have a preview.
        // Actually, in AccountSettings, onUpload is called immediately after selection.
        if (onDelete) {
            setIsUploading(true);
            try {
                await onDelete();
            } catch (error) {
                toast.error("Failed to remove profile picture");
                setRemoved(false);
            } finally {
                setIsUploading(false);
            }
        }
    };

    const triggerFilePicker = () => {
        if (editable && !isUploading) {
            fileInputRef.current?.click();
        }
    };

    const containerSizeClassName = size == 'sm' ? 'size-12' : size == 'md' ? 'size-16' : 'size-20'
    const buttonSizeClassName = size == 'sm' ? 'size-5' : size == 'md' ? 'size-6' : 'size-7'
    const buttonIconSizeClassName = size == 'sm' ? 'size-3' : size == 'md' ? 'size-3' : 'size-4'
    const cameraIconSizeClassName = size == 'sm' ? 'size-6' : size == 'md' ? 'size-8' : 'size-10'

    return (
        <div className={cn("relative flex flex-col items-center", className, containerSizeClassName)}>
            <div 
                className={cn(
                    "relative size-full rounded-full flex items-center justify-center cursor-pointer overflow-visible transition-all",
                    showDashedBorder && "border-2 border-dashed border-muted-foreground/40 bg-muted/30",
                    !showDashedBorder && "border-2 border-border",
                    !editable && "cursor-default"
                )}
                onClick={triggerFilePicker}
            >
                <Avatar className="size-full">
                    {hasImage && !imageLoaded && (
                        <Skeleton className="absolute inset-0 size-full rounded-full animate-pulse z-5" />
                    )}
                    <AvatarImage 
                        src={preview || (!removed ? currentImage : undefined)} 
                        className={cn("object-cover transition-opacity duration-300", actuallyShowingImage ? "opacity-100" : "opacity-0")}
                        onLoadingStatusChange={(status) => {
                            if (status === "loaded") {
                                // Small delay to ensure browser has rendered
                                setTimeout(() => setImageLoaded(true), 50);
                            }
                            if (status === "error") {
                                setImageLoaded(false);
                            }
                        }}
                    />
                    <AvatarFallback className="bg-transparent text-muted-foreground/50">
                        <Camera className={cameraIconSizeClassName} />
                    </AvatarFallback>
                </Avatar>


                {/* Loading State Overlay */}
                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 z-10">
                        <Loader2 className="size-6 animate-spin text-primary" />
                    </div>
                )}

                {/* The Plus/Edit/Remove Button at bottom right */}
                {editable && (
                    <div 
                        className={cn(
                            "absolute -bottom-1 -right-1 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 z-20",
                            showRemoveButton ? "bg-background text-foreground" : "bg-primary text-primary-foreground",
                            buttonSizeClassName
                        )}
                        onClick={(e) => showRemoveButton ? handleRemove(e) : triggerFilePicker()}
                    >
                        {showRemoveButton ? (
                            <X className={buttonIconSizeClassName}/>
                        ) : (
                            <Plus className={buttonIconSizeClassName}/>
                        )}
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
            />
        </div>
    );
}
