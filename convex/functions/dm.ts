import { v } from "convex/values";
import {
  authenticatedMutation,
  authenticatedQuery,
  requireDmMember,
} from "./helpers";
import { QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import { areFriends } from "./friend";

export const list = authenticatedQuery({
  handler: async (ctx) => {
    const directMessages = await ctx.db
      .query("directMessageMembers")
      .withIndex("by_user", (q) => q.eq("user", ctx.user._id))
      .collect();

    const results = await Promise.allSettled(
      directMessages.map(async (member) => ({
        ...(await getDirectMessage(ctx, member.directMessage)),
        unread: await countUnread(
          ctx,
          member.directMessage,
          ctx.user._id,
          member.lastReadAt ?? 0
        ),
      }))
    );

    return results
      .filter((res) => res.status === "fulfilled")
      .map((res) => (res as PromiseFulfilledResult<any>).value);
  },
});

const UNREAD_CAP = 99;

/** Messages from other people after `since`, capped so the query stays cheap. */
const countUnread = async (
  ctx: QueryCtx,
  directMessage: Id<"directMessages">,
  me: Id<"users">,
  since: number
) => {
  const recent = await ctx.db
    .query("messages")
    .withIndex("by_directMessage", (q) =>
      q.eq("directMessage", directMessage).gt("_creationTime", since)
    )
    .filter((q) => q.neq(q.field("sender"), me))
    .take(UNREAD_CAP + 1);
  return Math.min(recent.length, UNREAD_CAP);
};

/** Mark everything in the conversation as read for the current user. */
export const markRead = authenticatedMutation({
  args: { id: v.id("directMessages") },
  handler: async (ctx, { id }) => {
    const member = await requireDmMember(ctx, ctx.user, id);
    await ctx.db.patch(member._id, { lastReadAt: Date.now() });
  },
});

export const get = authenticatedQuery({
  args: {
    id: v.id("directMessages"),
  },
  handler: async (ctx, { id }) => {
    await requireDmMember(ctx, ctx.user, id);
    return await getDirectMessage(ctx, id);
  },
});

export const create = authenticatedMutation({
  args: {
    username: v.string(),
  },
  handler: async (ctx, { username }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();
    if (!user) {
      throw new Error("User does not exist.");
    }
    if (user._id === ctx.user._id) {
      throw new Error("You cannot message yourself.");
    }
    if (!(await areFriends(ctx, ctx.user._id, user._id))) {
      throw new Error("You can only message people you are friends with.");
    }

    const directMessagesForCurrentUser = await ctx.db
      .query("directMessageMembers")
      .withIndex("by_user", (q) => q.eq("user", ctx.user._id))
      .collect();

    const directMessagesForOtherUser = await ctx.db
      .query("directMessageMembers")
      .withIndex("by_user", (q) => q.eq("user", user._id))
      .collect();

    const directMessage = directMessagesForCurrentUser.find((dm) =>
      directMessagesForOtherUser.find(
        (dm2) => dm.directMessage === dm2.directMessage
      )
    );

    if (directMessage) {
      return directMessage.directMessage;
    }

    const newDirectMessage = await ctx.db.insert("directMessages", {});
    await Promise.all([
      ctx.db.insert("directMessageMembers", {
        user: ctx.user._id,
        directMessage: newDirectMessage,
      }),
      ctx.db.insert("directMessageMembers", {
        user: user._id,
        directMessage: newDirectMessage,
      }),
    ]);
    return newDirectMessage;
  },
});

const getDirectMessage = async (
  ctx: QueryCtx & { user: Doc<"users"> },
  id: Id<"directMessages">
) => {
  const dm = await ctx.db.get(id);
  if (!dm) {
    throw new Error("Direct message does not exist.");
  }

  const otherMember = await ctx.db
    .query("directMessageMembers")
    .withIndex("by_directMessage", (q) => q.eq("directMessage", id))
    .filter((q) => q.neq(q.field("user"), ctx.user._id))
    .first();

  if (!otherMember) {
    throw new Error("Direct message has no other members.");
  }

  const user = await ctx.db.get(otherMember.user);
  if (!user) {
    throw new Error("Other member does not exist.");
  }

  return {
    ...dm,
    user,
  };
};
