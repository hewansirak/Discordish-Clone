import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./helpers";
import { Doc, Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";
import { generateInviteCode, normalizeInviteCode } from "../lib/invite";
import { validateServerName } from "../lib/names";
import {
  canChangeRoles,
  canDeleteServer,
  canKick,
  canManageServer,
  Role,
} from "../lib/permissions";

/** Throws unless `user` belongs to the server. Returns their membership row. */
export async function requireServerMember(
  ctx: QueryCtx,
  user: Doc<"users">,
  server: Id<"servers">
) {
  const member = await ctx.db
    .query("serverMembers")
    .withIndex("by_server_user", (q) => q.eq("server", server).eq("user", user._id))
    .first();
  if (!member) {
    throw new Error("You are not a member of this server.");
  }
  return member;
}

async function uniqueInviteCode(ctx: QueryCtx) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCode();
    const taken = await ctx.db
      .query("servers")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .first();
    if (!taken) return code;
  }
  throw new Error("Could not generate an invite code, please try again.");
}

export const create = authenticatedMutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const server = await ctx.db.insert("servers", {
      name: validateServerName(name),
      owner: ctx.user._id,
      inviteCode: await uniqueInviteCode(ctx),
    });
    await ctx.db.insert("serverMembers", { server, user: ctx.user._id, role: "owner" });
    await ctx.db.insert("channels", { server, name: "general" });
    return server;
  },
});

/** Servers the current user belongs to, with their role in each. */
export const list = authenticatedQuery({
  handler: async (ctx) => {
    const memberships = await ctx.db
      .query("serverMembers")
      .withIndex("by_user", (q) => q.eq("user", ctx.user._id))
      .collect();
    const servers = await Promise.all(
      memberships.map(async (m) => {
        const server = await ctx.db.get(m.server);
        return server ? { _id: server._id, name: server.name, role: m.role } : null;
      })
    );
    return servers
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const get = authenticatedQuery({
  args: { id: v.id("servers") },
  handler: async (ctx, { id }) => {
    const member = await requireServerMember(ctx, ctx.user, id);
    const server = await ctx.db.get(id);
    if (!server) throw new Error("Server does not exist.");
    // Only moderators need the invite code on screen.
    const inviteCode = canManageServer(member.role) ? server.inviteCode : undefined;
    return { _id: server._id, name: server.name, role: member.role, inviteCode };
  },
});

export const join = authenticatedMutation({
  args: { inviteCode: v.string() },
  handler: async (ctx, { inviteCode }) => {
    const code = normalizeInviteCode(inviteCode);
    const server = await ctx.db
      .query("servers")
      .withIndex("by_inviteCode", (q) => q.eq("inviteCode", code))
      .first();
    if (!server) {
      throw new Error("That invite code is not valid.");
    }
    const existing = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_user", (q) => q.eq("server", server._id).eq("user", ctx.user._id))
      .first();
    if (!existing) {
      await ctx.db.insert("serverMembers", {
        server: server._id,
        user: ctx.user._id,
        role: "member",
      });
    }
    return server._id;
  },
});

export const leave = authenticatedMutation({
  args: { id: v.id("servers") },
  handler: async (ctx, { id }) => {
    const member = await requireServerMember(ctx, ctx.user, id);
    if (member.role === "owner") {
      throw new Error("Owners cannot leave. Delete the server instead.");
    }
    await ctx.db.delete(member._id);
  },
});

export const rename = authenticatedMutation({
  args: { id: v.id("servers"), name: v.string() },
  handler: async (ctx, { id, name }) => {
    const member = await requireServerMember(ctx, ctx.user, id);
    if (!canManageServer(member.role)) {
      throw new Error("Only admins can rename the server.");
    }
    await ctx.db.patch(id, { name: validateServerName(name) });
  },
});

export const regenerateInvite = authenticatedMutation({
  args: { id: v.id("servers") },
  handler: async (ctx, { id }) => {
    const member = await requireServerMember(ctx, ctx.user, id);
    if (!canManageServer(member.role)) {
      throw new Error("Only admins can create a new invite code.");
    }
    const inviteCode = await uniqueInviteCode(ctx);
    await ctx.db.patch(id, { inviteCode });
    return inviteCode;
  },
});

export const members = authenticatedQuery({
  args: { id: v.id("servers") },
  handler: async (ctx, { id }) => {
    await requireServerMember(ctx, ctx.user, id);
    const rows = await ctx.db
      .query("serverMembers")
      .withIndex("by_server", (q) => q.eq("server", id))
      .collect();
    const withUsers = await Promise.all(
      rows.map(async (row) => {
        const user = await ctx.db.get(row.user);
        return user ? { user, role: row.role as Role } : null;
      })
    );
    const order: Record<Role, number> = { owner: 0, admin: 1, member: 2 };
    return withUsers
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => order[a.role] - order[b.role] || a.user.username.localeCompare(b.user.username));
  },
});

export const setRole = authenticatedMutation({
  args: {
    id: v.id("servers"),
    user: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, { id, user, role }) => {
    const actor = await requireServerMember(ctx, ctx.user, id);
    if (!canChangeRoles(actor.role)) {
      throw new Error("Only the owner can change roles.");
    }
    const target = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_user", (q) => q.eq("server", id).eq("user", user))
      .first();
    if (!target) throw new Error("That user is not in this server.");
    if (target.role === "owner") throw new Error("The owner's role cannot be changed.");
    await ctx.db.patch(target._id, { role });
  },
});

export const kick = authenticatedMutation({
  args: { id: v.id("servers"), user: v.id("users") },
  handler: async (ctx, { id, user }) => {
    const actor = await requireServerMember(ctx, ctx.user, id);
    const target = await ctx.db
      .query("serverMembers")
      .withIndex("by_server_user", (q) => q.eq("server", id).eq("user", user))
      .first();
    if (!target) throw new Error("That user is not in this server.");
    if (!canKick(actor.role, target.role)) {
      throw new Error("You do not have permission to remove this member.");
    }
    await ctx.db.delete(target._id);
  },
});

/** Delete a server and everything in it. Owner only. */
export const remove = authenticatedMutation({
  args: { id: v.id("servers") },
  handler: async (ctx, { id }) => {
    const member = await requireServerMember(ctx, ctx.user, id);
    if (!canDeleteServer(member.role)) {
      throw new Error("Only the owner can delete the server.");
    }
    await deleteServerData(ctx, id);
  },
});

async function deleteServerData(ctx: MutationCtx, server: Id<"servers">) {
  const channels = await ctx.db
    .query("channels")
    .withIndex("by_server", (q) => q.eq("server", server))
    .collect();
  for (const channel of channels) {
    await deleteChannelMessages(ctx, channel._id);
    await ctx.db.delete(channel._id);
  }
  const members = await ctx.db
    .query("serverMembers")
    .withIndex("by_server", (q) => q.eq("server", server))
    .collect();
  await Promise.all(members.map((m) => ctx.db.delete(m._id)));
  await ctx.db.delete(server);
}

/** Remove a channel's messages and any uploaded images they reference. */
export async function deleteChannelMessages(ctx: MutationCtx, channel: Id<"channels">) {
  const messages = await ctx.db
    .query("channelMessages")
    .withIndex("by_channel", (q) => q.eq("channel", channel))
    .collect();
  for (const message of messages) {
    if (message.attachment) await ctx.storage.delete(message.attachment);
    await ctx.db.delete(message._id);
  }
}
