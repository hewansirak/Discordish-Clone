"use client";

import { LoaderIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo } from "react";

export function ImagePreview({
  file,
  isUploading,
  onRemove,
}: {
  file: File;
  isUploading: boolean;
  onRemove?: () => void;
}) {
  // Create the preview URL once per file and release it afterwards.
  const previewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  return (
    <div className="relative w-40 h-40 overflow-hidden rounded-lg border border-border/50 bg-card/50">
      <Image
        src={previewUrl}
        alt="Attachment preview"
        width={160}
        height={160}
        unoptimized
        className="w-full h-full object-cover"
      />
      {isUploading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <LoaderIcon className="animate-spin h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Uploading...</p>
          </div>
        </div>
      )}
      {onRemove && !isUploading && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-1 right-1 rounded-full bg-background/80 p-1 hover:bg-background"
        >
          <XIcon className="size-4" />
          <span className="sr-only">Remove attachment</span>
        </button>
      )}
    </div>
  );
}
