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
