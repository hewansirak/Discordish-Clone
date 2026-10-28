"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useScreenRecording } from "@/hooks/use-screen-recording";
import { formatBytes, formatDuration, isRecordingSupported } from "@/lib/recording";
import { cn } from "@/lib/utils";
import { CircleIcon, LoaderIcon, SquareIcon, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export type Visibility = "public" | "private";

export type VideoSubmission = {
  blob: Blob;
  duration: number;
  title: string;
  description: string;
  visibility: Visibility;
};

type Source = { blob: Blob; url: string; duration: number };

/** Read a video file's length in seconds. */
function readDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const probe = document.createElement("video");
    probe.preload = "metadata";
    probe.onloadedmetadata = () => {
      // Recorded WebM files report Infinity until they are fully read.
      resolve(Number.isFinite(probe.duration) ? Math.round(probe.duration) : 0);
    };
    probe.onerror = () => resolve(0);
    probe.src = url;
  });
}

export function RecordDialog({
  open,
  onOpenChange,
  title = "Record your screen",
  confirmLabel = "Save video",
  showDetails = false,
  allowFileUpload = false,
  defaultVisibility = "private",
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  confirmLabel?: string;
  /** Ask for a title, description and visibility before saving. */
  showDetails?: boolean;
  /** Let people pick an existing video file instead of recording. */
  allowFileUpload?: boolean;
  defaultVisibility?: Visibility;
  onConfirm: (video: VideoSubmission) => Promise<void>;
}) {
  const { status, recording, start, stop, reset } = useScreenRecording();
  const [picked, setPicked] = useState<Source | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickedUrlRef = useRef<string | null>(null);

  const source: Source | null = picked ?? recording;

  const clearPicked = () => {
    if (pickedUrlRef.current) URL.revokeObjectURL(pickedUrlRef.current);
    pickedUrlRef.current = null;
    setPicked(null);
  };

  const resetAll = () => {
    reset();
    clearPicked();
    setVideoTitle("");
    setDescription("");
    setVisibility(defaultVisibility);
  };

  // Always start from a clean slate when the dialog closes.
  useEffect(() => {
    if (!open) resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => () => clearPicked(), []);

  const handleStart = async () => {
    clearPicked();
    const error = await start(true);
    if (error) toast.error("Could not start recording", { description: error });
  };

  const handlePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("Please choose a video file.");
      return;
    }
    reset();
    clearPicked();
    const url = URL.createObjectURL(file);
    pickedUrlRef.current = url;
    setPicked({ blob: file, url, duration: await readDuration(url) });
    if (!videoTitle) setVideoTitle(file.name.replace(/\.[^.]+$/, ""));
  };

  const handleConfirm = async () => {
    if (!source) return;
    if (showDetails && !videoTitle.trim()) {
      toast.error("Give your video a title.");
      return;
    }
    setSaving(true);
    try {
      await onConfirm({
        blob: source.blob,
        duration: source.duration,
        title: videoTitle.trim(),
        description: description.trim(),
        visibility,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error("Could not save the video", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const supported = isRecordingSupported();

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Pick a screen, window or tab. Your microphone is mixed in if you allow it.
          </DialogDescription>
        </DialogHeader>

        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-border/50 bg-muted/30">
          {status === "recording" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="size-3 animate-pulse rounded-full bg-destructive" />
              Recording in progress…
            </div>
          ) : source ? (
            <video src={source.url} controls className="h-full w-full bg-black" />
          ) : (
            <p className="px-6 text-center text-sm text-muted-foreground">
              {supported
                ? "Press Record to start capturing your screen."
                : "Screen recording is not supported in this browser."}
            </p>
          )}
        </div>

        {source && (
          <p className="text-xs text-muted-foreground">
            {source.duration > 0 && <>{formatDuration(source.duration)} · </>}
            {formatBytes(source.blob.size)}
          </p>
        )}

        {source && showDetails && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="video-title">Title</Label>
              <Input
                id="video-title"
                value={videoTitle}
                maxLength={100}
                onChange={(e) => setVideoTitle(e.target.value)}
                placeholder="What is this video about?"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="video-description">Description (optional)</Label>
              <textarea
                id="video-description"
                value={description}
                maxLength={1000}
                rows={3}
                onChange={(e) => setDescription(e.target.value)}
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Who can watch with the link</Label>
              <div className="flex gap-2">
                {(["private", "public"] as const).map((option) => (
                  <Button
                    key={option}
                    type="button"
                    size="sm"
                    variant={visibility === option ? "default" : "outline"}
                    className={cn("capitalize")}
                    onClick={() => setVisibility(option)}
                  >
                    {option}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {status === "recording" ? (
            <Button variant="destructive" onClick={stop}>
              <SquareIcon className="mr-2 size-4" />
              Stop recording
            </Button>
          ) : (
            <>
              {allowFileUpload && (
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadIcon className="mr-2 size-4" />
                  Choose file
                </Button>
              )}
              <Button
                variant={source ? "outline" : "default"}
                disabled={!supported || saving}
                onClick={handleStart}
              >
                <CircleIcon className="mr-2 size-4 text-destructive" />
                {source ? "Record again" : "Record"}
              </Button>
              {source && (
                <Button disabled={saving} onClick={handleConfirm}>
                  {saving && <LoaderIcon className="mr-2 size-4 animate-spin" />}
                  {saving ? "Uploading…" : confirmLabel}
                </Button>
              )}
            </>
          )}
        </DialogFooter>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handlePick}
        />
      </DialogContent>
    </Dialog>
  );
}
