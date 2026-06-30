"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getCaptureStreams,
  mixAudio,
  pickMimeType,
  stopStreams,
} from "@/lib/recording";

export type Recording = {
  blob: Blob;
  url: string;
  /** Length in whole seconds, measured while recording. */
  duration: number;
};

export type RecorderStatus = "idle" | "recording" | "recorded";

export function useScreenRecording() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [recording, setRecording] = useState<Recording | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamsRef = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const urlRef = useRef<string | null>(null);

  const releaseCapture = useCallback(() => {
    stopStreams(...streamsRef.current);
    streamsRef.current = [];
    void audioContextRef.current?.close().catch(() => undefined);
    audioContextRef.current = null;
  }, []);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else releaseCapture();
  }, [releaseCapture]);

  const reset = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder) {
      // Discard whatever is still being recorded instead of saving it.
      recorder.onstop = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    recorderRef.current = null;
    releaseCapture();
    revokeUrl();
    chunksRef.current = [];
    setRecording(null);
    setStatus("idle");
  }, [releaseCapture, revokeUrl]);
