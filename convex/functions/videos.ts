import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./helpers";
import { getCurrentUser } from "./user";
import { internal } from "../_generated/api";
import { internalMutation, internalQuery, query, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export const MAX_TITLE_LENGTH = 100;
export const MAX_DESCRIPTION_LENGTH = 1000;
/** Stay well inside the free Convex storage quota (1 GB total). */
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
/** At most this many new videos per user inside the window. */
export const UPLOAD_LIMIT = 5;
export const UPLOAD_WINDOW_MS = 10 * 60 * 1000;
const LIST_LIMIT = 100;
/** Groq's speech-to-text endpoint rejects files larger than this on the free tier. */
export const TRANSCRIBE_MAX_BYTES = 25 * 1024 * 1024;

function cleanTitle(raw: string) {
  const title = raw.trim();
  if (!title) throw new Error("A video needs a title.");
  if (title.length > MAX_TITLE_LENGTH) {
    throw new Error(`Title is too long (max ${MAX_TITLE_LENGTH} characters).`);
  }
  return title;
}

function cleanDescription(raw: string | undefined) {
  const description = raw?.trim();
  if (description && description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Description is too long (max ${MAX_DESCRIPTION_LENGTH} characters).`);
  }
  return description || undefined;
}

async function requireOwnVideo(
  ctx: QueryCtx,
  user: Doc<"users">,
  id: Id<"videos">
): Promise<Doc<"videos">> {
  const video = await ctx.db.get(id);
  if (!video) throw new Error("Video does not exist.");
  if (video.owner !== user._id) throw new Error("You do not own this video.");
  return video;
}

/**
 * A message can only carry a finished video that its sender owns. Used when
 * posting to a DM or a channel.
 */
export async function requireShareableVideo(
  ctx: QueryCtx,
  user: Doc<"users">,
  id: Id<"videos">
) {
  const video = await requireOwnVideo(ctx, user, id);
  if (video.status !== "ready") throw new Error("This video is not ready to share yet.");
  return video;
}

/**
 * The single rule for who may play a video:
 * - the owner (any status),
 * - anyone, signed in or not, if it is public and ready,
 * - anyone who can see a DM or channel message that carries it.
 */
export async function canViewVideo(
  ctx: QueryCtx,
  viewer: Doc<"users"> | null,
  video: Doc<"videos">
): Promise<boolean> {
  if (viewer && video.owner === viewer._id) return true;
  if (video.status !== "ready") return false;
  if (video.visibility === "public") return true;
  if (!viewer) return false;

  const dmMessages = await ctx.db
    .query("messages")
    .withIndex("by_video", (q) => q.eq("video", video._id))
    .take(LIST_LIMIT);
  for (const message of dmMessages) {
    const member = await ctx.db
      .query("directMessageMembers")
      .withIndex("by_directMessage_user", (q) =>
        q.eq("directMessage", message.directMessage).eq("user", viewer._id)
      )
      .first();
    if (member) return true;
  }

  const channelMessages = await ctx.db
    .query("channelMessages")
    .withIndex("by_video", (q) => q.eq("video", video._id))
    .take(LIST_LIMIT);
  for (const message of channelMessages) {
    const member = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_user", (q) => q.eq("server", message.server).eq("user", viewer._id))
      .first();
    if (member) return true;
  }
  return false;
}

/** Playback details for a video the caller is already allowed to see. */
async function toPlayable(ctx: QueryCtx, video: Doc<"videos">) {
  return {
    _id: video._id,
    _creationTime: video._creationTime,
    title: video.title,
    description: video.description,
    duration: video.duration,
    visibility: video.visibility,
    status: video.status,
    transcript: video.transcript,
    transcriptStatus: video.transcriptStatus,
    url: video.storageId ? await ctx.storage.getUrl(video.storageId) : null,
  };
}

/**
 * Video attached to a chat message. Call only after the caller passed the
 * conversation's membership check; deleted videos come back as null.
 */
export async function toChatVideo(ctx: QueryCtx, id: Id<"videos"> | undefined) {
  if (!id) return null;
  const video = await ctx.db.get(id);
  if (!video || video.status !== "ready") return null;
  return {
    _id: video._id,
    title: video.title,
    duration: video.duration,
    url: video.storageId ? await ctx.storage.getUrl(video.storageId) : null,
  };
}

export const generateUploadUrl = authenticatedMutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/** Step 1 of an upload: reserve a row. Enforces the per-user rate limit. */
export const create = authenticatedMutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    duration: v.number(),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  handler: async (ctx, { title, description, duration, visibility }) => {
    const cutoff = Date.now() - UPLOAD_WINDOW_MS;
    const recent = await ctx.db
      .query("videos")
      .withIndex("by_owner", (q) => q.eq("owner", ctx.user._id).gt("_creationTime", cutoff))
      .take(UPLOAD_LIMIT);
    if (recent.length >= UPLOAD_LIMIT) {
      throw new Error("You are uploading too fast. Please wait a few minutes and try again.");
    }
    return await ctx.db.insert("videos", {
      owner: ctx.user._id,
      title: cleanTitle(title),
      description: cleanDescription(description),
      duration: Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0,
      visibility,
      status: "uploading",
    });
  },
});
