"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, X, Plus, Loader } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

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
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>(currentImage ? 'loading' : 'error');
    const [removed, setRemoved] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when props change
    useEffect(() => {
        setRemoved(false);
        if (preview) {
             setStatus('success');
        } else if (currentImage && !removed) {
            setStatus('loading');
        } else {
            setStatus('error');
        }
    }, [currentImage, hasCustomImage, preview, removed]);

    const hasImage = (!!preview || (!!currentImage && !removed));
    const isSuccess = status === 'success' && hasImage;

    const showRemoveButton = (isSuccess && hasCustomImage) && !removed;
    const showDashedBorder = !isSuccess && status !== 'loading';

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error("Image must be smaller than 10MB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64 = reader.result as string;
            setPreview(base64);
            setRemoved(false);
            setStatus('success'); // Preview is immediate
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
        
        if (preview) {
            setPreview(null);
            if (onImageSelected) {
                onImageSelected(null);
            }
        } else {
            setRemoved(true);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

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
    const buttonSizeClassName = size == 'sm' ? 'size-6' : size == 'md' ? 'size-6.5' : 'size-7'
    const buttonIconSizeClassName = size == 'sm' ? 'size-4' : size == 'md' ? 'size-4.5' : 'size-5'
    const cameraIconSizeClassName = size == 'sm' ? 'size-6' : size == 'md' ? 'size-7' : 'size-8'
    const buttonPositionLength = size == 'sm' ? '-bottom-2 -right-2' : size == 'md' ? '-bottom-1.5 -right-1.5' : '-bottom-1 -right-1'

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
                <div className="relative size-full overflow-hidden rounded-full bg-muted">
                    {/* Skeleton Layer */}
                    {status === 'loading' && hasImage && (
                        <Skeleton className="absolute inset-0 z-10 size-full rounded-full" />
                    )}

                    {/* Image Layer */}
                    {hasImage && (
                        <img 
                            src={preview || currentImage || undefined} 
                            alt="Profile"
                            className={cn(
                                "aspect-square h-full w-full object-cover transition-opacity duration-500", 
                                isSuccess ? "opacity-100" : "opacity-0"
                            )}
                            onLoad={() => setStatus('success')}
                            onError={() => setStatus('error')}
                        />
                    )}
                    
                    {/* Camera Icon Layer */}
                    {(status === 'error' || !hasImage) && (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50 animate-in fade-in duration-300">
                            <Camera className={cameraIconSizeClassName} />
                        </div>
                    )}
                </div>


                {/* Loading State Overlay */}
                {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60 z-20">
                        <Loader className="size-6 animate-spin text-primary" />
                    </div>
                )}

                {/* The Plus/Edit/Remove Button at bottom right */}
                {editable && (
                    <div 
                        className={cn(
                            "absolute rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 z-30",
                            showRemoveButton ? "bg-background text-foreground" : "bg-primary text-primary-foreground",
                            buttonSizeClassName,
                            buttonPositionLength
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
