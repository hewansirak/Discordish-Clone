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

/** Ask for the screen, and for the microphone if requested. A denied mic is not fatal. */
export async function getCaptureStreams(withMic: boolean): Promise<CaptureStreams> {
  const display = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: true,
  });
  let mic: MediaStream | null = null;
  if (withMic) {
    try {
      mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      mic = null;
    }
  }
  return { display, mic, hasDisplayAudio: display.getAudioTracks().length > 0 };
}

/** Mix tab/system audio and the microphone into one audio track. */
export function mixAudio(
  context: AudioContext,
  { display, mic, hasDisplayAudio }: CaptureStreams
): MediaStreamAudioDestinationNode | null {
  if (!hasDisplayAudio && !mic) return null;
  const destination = context.createMediaStreamDestination();
  if (hasDisplayAudio) {
    context.createMediaStreamSource(new MediaStream(display.getAudioTracks())).connect(destination);
  }
  if (mic) {
    const gain = context.createGain();
    gain.gain.value = 1.2;
    context.createMediaStreamSource(mic).connect(gain).connect(destination);
  }
  return destination;
}

export function stopStreams(...streams: (MediaStream | null | undefined)[]) {
  for (const stream of streams) stream?.getTracks().forEach((track) => track.stop());
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
