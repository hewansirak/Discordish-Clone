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

  /** Returns an error message, or null if recording started. */
  const start = useCallback(
    async (withMic = true): Promise<string | null> => {
      reset();
      try {
        const capture = await getCaptureStreams(withMic);
        streamsRef.current = [capture.display, ...(capture.mic ? [capture.mic] : [])];

        const combined = new MediaStream(capture.display.getVideoTracks());
        const context = new AudioContext();
        audioContextRef.current = context;
        mixAudio(context, capture)?.stream
          .getAudioTracks()
          .forEach((track) => combined.addTrack(track));

        const mimeType = pickMimeType();
        const recorder = new MediaRecorder(combined, mimeType ? { mimeType } : undefined);
        recorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data);
        };
        recorder.onstop = () => {
          const type = recorder.mimeType || mimeType || "video/webm";
          const blob = new Blob(chunksRef.current, { type });
          releaseCapture();
          if (blob.size === 0) {
            setStatus("idle");
            return;
          }
          const url = URL.createObjectURL(blob);
          urlRef.current = url;
          setRecording({
            blob,
            url,
            duration: Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000)),
          });
          setStatus("recorded");
        };

        // "Stop sharing" in the browser UI ends the video track; treat it as stop.
        capture.display.getVideoTracks()[0]?.addEventListener("ended", stop);

        startedAtRef.current = Date.now();
        recorder.start(1000);
        setStatus("recording");
        return null;
      } catch (error) {
        releaseCapture();
        recorderRef.current = null;
        setStatus("idle");
        if (error instanceof DOMException && error.name === "NotAllowedError") {
          return "Screen sharing was cancelled or blocked.";
        }
        return error instanceof Error ? error.message : "Could not start recording.";
      }
    },
    [reset, releaseCapture, stop]
  );

  // Stop capturing and free the preview URL when the component goes away.
  useEffect(() => reset, [reset]);

  return { status, recording, start, stop, reset };
}
