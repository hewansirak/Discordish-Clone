"use client";

import { useMutation } from "convex/react";
import { useCallback } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

export const MAX_VIDEO_MB = 500;

type NewVideo = {
  blob: Blob;
  duration: number;
  title: string;
  description?: string;
  visibility: "public" | "private";
};

/**
 * Upload flow: reserve a row, POST the file to Convex storage, then finalize.
 * Returns the video id. Throws a readable error if any step fails.
 */
export function useVideoUpload() {
  const create = useMutation(api.functions.videos.create);
  const generateUploadUrl = useMutation(api.functions.videos.generateUploadUrl);
  const finalize = useMutation(api.functions.videos.finalize);
  const markFailed = useMutation(api.functions.videos.markFailed);

  return useCallback(
    async ({ blob, duration, title, description, visibility }: NewVideo): Promise<Id<"videos">> => {
      if (blob.size > MAX_VIDEO_MB * 1024 * 1024) {
        throw new Error(`Videos can be at most ${MAX_VIDEO_MB} MB.`);
      }
      const id = await create({ title, description, duration, visibility });
      try {
        const url = await generateUploadUrl();
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": blob.type || "video/webm" },
          body: blob,
        });
        if (!response.ok) throw new Error("The upload was rejected.");
        const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
        const result = await finalize({ id, storageId });
        if (!result.ok) throw new Error(result.error);
        return id;
      } catch (error) {
        // A server-side rejection already marked it failed; this covers network errors.
        await markFailed({ id }).catch(() => undefined);
        throw error;
      }
    },
    [create, generateUploadUrl, finalize, markFailed]
  );
}
