import { v } from "convex/values";
import {
  authenticatedMutation,
  authenticatedQuery,
  requireDmMember,
} from "./helpers";
import { internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

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
export async function toClientMessage(ctx: QueryCtx, message: Doc<"messages">) {
  const sender = await ctx.db.get(message.sender);
  const attachment = message.attachment
    ? await ctx.storage.getUrl(message.attachment)
    : undefined;
  return { ...message, attachment, sender };
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
    return await Promise.all(messages.map((m) => toClientMessage(ctx, m)));
  },
});

export const create = authenticatedMutation({
  args: {
    content: v.string(),
    directMessage: v.id("directMessages"),
    attachment: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { content: rawContent, directMessage, attachment }) => {
    const content = validateContent(rawContent, Boolean(attachment));
    await requireDmMember(ctx, ctx.user, directMessage);
    await ctx.db.insert("messages", {
      content,
      directMessage,
      attachment,
      sender: ctx.user._id,
    });
    await ctx.scheduler.runAfter(0, internal.functions.typing.remove, {
      directMessage,
      user: ctx.user._id,
    });
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
