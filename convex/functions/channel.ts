import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./helpers";
import { deleteChannelMessages, requireServerMember } from "./server";
import { normalizeChannelName } from "../lib/names";
import { canManageChannels } from "../lib/permissions";

const MAX_CHANNELS = 50;

export const list = authenticatedQuery({
  args: { server: v.id("servers") },
  handler: async (ctx, { server }) => {
    await requireServerMember(ctx, ctx.user, server);
    const channels = await ctx.db
      .query("channels")
      .withIndex("by_server", (q) => q.eq("server", server))
      .collect();
    return channels.sort((a, b) => a._creationTime - b._creationTime);
  },
});

export const create = authenticatedMutation({
  args: { server: v.id("servers"), name: v.string() },
  handler: async (ctx, { server, name }) => {
    const member = await requireServerMember(ctx, ctx.user, server);
    if (!canManageChannels(member.role)) {
      throw new Error("Only admins can create channels.");
    }
    const normalized = normalizeChannelName(name);
    const existing = await ctx.db
      .query("channels")
      .withIndex("by_server", (q) => q.eq("server", server))
      .collect();
    if (existing.length >= MAX_CHANNELS) {
      throw new Error(`A server can have at most ${MAX_CHANNELS} channels.`);
    }
    if (existing.some((c) => c.name === normalized)) {
      throw new Error(`#${normalized} already exists.`);
    }
    return await ctx.db.insert("channels", { server, name: normalized });
  },
});

export const rename = authenticatedMutation({
  args: { id: v.id("channels"), name: v.string() },
  handler: async (ctx, { id, name }) => {
    const channel = await ctx.db.get(id);
    if (!channel) throw new Error("Channel does not exist.");
    const member = await requireServerMember(ctx, ctx.user, channel.server);
    if (!canManageChannels(member.role)) {
      throw new Error("Only admins can rename channels.");
    }
    const normalized = normalizeChannelName(name);
    const siblings = await ctx.db
      .query("channels")
      .withIndex("by_server", (q) => q.eq("server", channel.server))
      .collect();
    if (siblings.some((c) => c._id !== id && c.name === normalized)) {
      throw new Error(`#${normalized} already exists.`);
    }
    await ctx.db.patch(id, { name: normalized });
  },
});

export const remove = authenticatedMutation({
  args: { id: v.id("channels") },
  handler: async (ctx, { id }) => {
    const channel = await ctx.db.get(id);
    if (!channel) throw new Error("Channel does not exist.");
    const member = await requireServerMember(ctx, ctx.user, channel.server);
    if (!canManageChannels(member.role)) {
      throw new Error("Only admins can delete channels.");
    }
    const siblings = await ctx.db
      .query("channels")
      .withIndex("by_server", (q) => q.eq("server", channel.server))
      .collect();
    if (siblings.length <= 1) {
      throw new Error("A server needs at least one channel.");
    }
    await deleteChannelMessages(ctx, id);
    await ctx.db.delete(id);
  },
});
