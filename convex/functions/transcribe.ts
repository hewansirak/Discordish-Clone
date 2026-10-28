"use node";

import Groq, { toFile } from "groq-sdk";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

/**
 * Speech-to-text for a saved video, using Groq's Whisper endpoint.
 * Scheduled only when GROQ_API_KEY is set in the Convex dashboard.
 */
export const run = internalAction({
  args: { id: v.id("videos") },
  handler: async (ctx, { id }): Promise<void> => {
    const fail = async (): Promise<void> => {
      await ctx.runMutation(internal.functions.videos.setTranscript, { id, status: "failed" });
    };
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return await fail();

    const video = await ctx.runQuery(internal.functions.videos.getForTranscript, { id });
    if (!video) return;

    try {
      const blob = await ctx.storage.get(video.storageId);
      if (!blob) return await fail();
      const file = await toFile(blob, "recording.webm", { type: video.mimeType });
      const groq = new Groq({ apiKey });
      const result = await groq.audio.transcriptions.create({
        file,
        model: "whisper-large-v3",
        response_format: "json",
      });
      await ctx.runMutation(internal.functions.videos.setTranscript, {
        id,
        transcript: result.text.trim(),
        status: "done",
      });
    } catch (error) {
      console.error("Transcription failed:", error);
      await fail();
    }
  },
});
