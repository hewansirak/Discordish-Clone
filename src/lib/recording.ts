/** Browser helpers for capturing the screen and mixing in the microphone. */

export type CaptureStreams = {
  display: MediaStream;
  mic: MediaStream | null;
  hasDisplayAudio: boolean;
};

/** First container/codec the browser's MediaRecorder supports, best quality first. */
export function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}

export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getDisplayMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}
