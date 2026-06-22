import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./helpers";
import { requireServerMember } from "./server";
import { validateContent } from "./message";
import { requireShareableVideo, toChatVideo } from "./videos";
import { canDeleteOthersMessages } from "../lib/permissions";
import { QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

const PAGE_SIZE = 100;

async function loadChannel(ctx: QueryCtx, user: Doc<"users">, channelId: Id<"channels">) {
  const channel = await ctx.db.get(channelId);
  if (!channel) throw new Error("Channel does not exist.");
  const member = await requireServerMember(ctx, user, channel.server);
  return { channel, member };
}

/** The most recent messages in a channel, oldest first. */
export const list = authenticatedQuery({
  args: { channel: v.id("channels") },
  handler: async (ctx, { channel }) => {
    await loadChannel(ctx, ctx.user, channel);
    const newest = await ctx.db
      .query("channelMessages")
      .withIndex("by_channel", (q) => q.eq("channel", channel))
      .order("desc")
      .take(PAGE_SIZE);
    const withDetails = await Promise.all(
      newest.reverse().map(async (message) => ({
        ...message,
        sender: await ctx.db.get(message.sender),
        attachment: message.attachment ? await ctx.storage.getUrl(message.attachment) : undefined,
        video: await toChatVideo(ctx, message.video),
        hasVideo: Boolean(message.video),
      }))
    );
    return withDetails;
  },
});

export const send = authenticatedMutation({
  args: {
    channel: v.id("channels"),
    content: v.string(),
    attachment: v.optional(v.id("_storage")),
  },
  handler: async (ctx, { channel, content: raw, attachment }) => {
    const content = validateContent(raw, Boolean(attachment));
    const { channel: row } = await loadChannel(ctx, ctx.user, channel);
    await ctx.db.insert("channelMessages", {
      channel,
      server: row.server,
      sender: ctx.user._id,
      content,
      attachment,
    });
  },
});

export const edit = authenticatedMutation({
  args: { id: v.id("channelMessages"), content: v.string() },
  handler: async (ctx, { id, content: raw }) => {
    const message = await ctx.db.get(id);
    if (!message) throw new Error("Message does not exist.");
    if (message.sender !== ctx.user._id) {
      throw new Error("You are not the sender of this message.");
    }
    await requireServerMember(ctx, ctx.user, message.server);
    const content = validateContent(raw, Boolean(message.attachment));
    if (content === message.content) return;
    await ctx.db.patch(id, { content, editedAt: Date.now() });
  },
});

/** Senders can delete their own messages; admins and the owner can delete anyone's. */
export const remove = authenticatedMutation({
  args: { id: v.id("channelMessages") },
  handler: async (ctx, { id }) => {
    const message = await ctx.db.get(id);
    if (!message) throw new Error("Message does not exist.");
    const member = await requireServerMember(ctx, ctx.user, message.server);
    if (message.sender !== ctx.user._id && !canDeleteOthersMessages(member.role)) {
      throw new Error("You do not have permission to delete this message.");
    }
    await ctx.db.delete(id);
    if (message.attachment) await ctx.storage.delete(message.attachment);
  },
});
