import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  authenticatedMutation,
  authenticatedQuery,
  requireDmMember,
} from "./helpers";
import { internal } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";
import { summarizeReactions } from "../lib/emoji";
import { requireShareableVideo, toChatVideo } from "./videos";

export const MAX_MESSAGE_LENGTH = 2000;

/** Trim the text and enforce length limits. A message needs text or an attachment. */
export function validateContent(raw: string, hasAttachment: boolean): string {
  const content = raw.trim();
  if (!content && !hasAttachment) {
    throw new Error("Message cannot be empty.");
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`);
  }
  return content;
}

/** Add the sender and a public attachment URL to a stored message. */
export async function toClientMessage(
  ctx: QueryCtx,
  message: Doc<"messages">,
  viewer: Id<"users">
) {
  const sender = await ctx.db.get(message.sender);
  const attachment = message.attachment
    ? await ctx.storage.getUrl(message.attachment)
    : undefined;
  const replyTo = message.replyTo ? await getReplyPreview(ctx, message.replyTo) : null;
  const reactionRows = await ctx.db
    .query("reactions")
    .withIndex("by_message", (q) => q.eq("message", message._id))
    .collect();
  return {
    ...message,
    attachment,
    video: await toChatVideo(ctx, message.video),
    hasVideo: Boolean(message.video),
    sender,
    replyTo,
    reactions: summarizeReactions(reactionRows, viewer),
  };
}

/** Short quote of the message being replied to, or a tombstone if it was deleted. */
async function getReplyPreview(ctx: QueryCtx, id: Id<"messages">) {
  const original = await ctx.db.get(id);
  if (!original) {
    return { _id: id, deleted: true as const, content: "", senderName: "" };
  }
  const sender = await ctx.db.get(original.sender);
  return {
    _id: id,
    deleted: false as const,
    content: original.content.slice(0, 120) ||
      (original.video ? "Video" : original.attachment ? "Image" : ""),
    senderName: sender?.username ?? "Deleted User",
  };
}

export const list = authenticatedQuery({
  args: {
    directMessage: v.id("directMessages"),
  },
  handler: async (ctx, { directMessage }) => {
    await requireDmMember(ctx, ctx.user, directMessage);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_directMessage", (q) =>
        q.eq("directMessage", directMessage)
      )
      .collect();
    return await Promise.all(messages.map((m) => toClientMessage(ctx, m, ctx.user._id)));
  },
});

/** Newest-first pages of messages, so long conversations load incrementally. */
export const listPage = authenticatedQuery({
  args: {
    directMessage: v.id("directMessages"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, { directMessage, paginationOpts }) => {
    await requireDmMember(ctx, ctx.user, directMessage);
    const result = await ctx.db
      .query("messages")
      .withIndex("by_directMessage", (q) => q.eq("directMessage", directMessage))
      .order("desc")
      .paginate(paginationOpts);
    return {
      ...result,
      page: await Promise.all(result.page.map((m) => toClientMessage(ctx, m, ctx.user._id))),
    };
  },
});

/** Full-text search inside one conversation. */
export const search = authenticatedQuery({
  args: {
    directMessage: v.id("directMessages"),
    query: v.string(),
  },
  handler: async (ctx, { directMessage, query }) => {
    await requireDmMember(ctx, ctx.user, directMessage);
    const term = query.trim();
    if (term.length < 2) return [];
    const matches = await ctx.db
      .query("messages")
      .withSearchIndex("search_content", (q) =>
        q.search("content", term).eq("directMessage", directMessage)
      )
      .take(20);
    return await Promise.all(matches.map((m) => toClientMessage(ctx, m, ctx.user._id)));
  },
});

export const create = authenticatedMutation({
  args: {
    content: v.string(),
    directMessage: v.id("directMessages"),
    attachment: v.optional(v.id("_storage")),
    replyTo: v.optional(v.id("messages")),
  },
  handler: async (ctx, { content: rawContent, directMessage, attachment, replyTo }) => {
    const content = validateContent(rawContent, Boolean(attachment));
    await requireDmMember(ctx, ctx.user, directMessage);
    if (replyTo) {
      const original = await ctx.db.get(replyTo);
      if (!original || original.directMessage !== directMessage) {
        throw new Error("The message you are replying to is not in this conversation.");
      }
    }
    await ctx.db.insert("messages", {
      content,
      directMessage,
      attachment,
      replyTo,
      sender: ctx.user._id,
    });
    await ctx.scheduler.runAfter(0, internal.functions.typing.remove, {
      directMessage,
      user: ctx.user._id,
    });
  },
});

export const edit = authenticatedMutation({
  args: {
    id: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, { id, content: rawContent }) => {
    const message = await ctx.db.get(id);
    if (!message) {
      throw new Error("Message does not exist.");
    } else if (message.sender !== ctx.user._id) {
      throw new Error("You are not the sender of this message.");
    }
    const content = validateContent(rawContent, Boolean(message.attachment));
    if (content === message.content) return;
    await ctx.db.patch(id, { content, editedAt: Date.now() });
  },
});

export const remove = authenticatedMutation({
  args: {
    id: v.id("messages"),
  },
  handler: async (ctx, { id }) => {
    const message = await ctx.db.get(id);
    if (!message) {
      throw new Error("Message does not exist.");
    } else if (message.sender !== ctx.user._id) {
      throw new Error("You are not the sender of this message.");
    }
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_message", (q) => q.eq("message", id))
      .collect();
    await Promise.all(reactions.map((r) => ctx.db.delete(r._id)));
    await ctx.db.delete(id);
    if (message.attachment) {
      await ctx.storage.delete(message.attachment);
    }
  },
});

export const generateUploadUrl = authenticatedMutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
