import { Id } from "../_generated/dataModel";
import { authenticatedMutation, authenticatedQuery } from "./helpers";
import { QueryCtx } from "../_generated/server";
import { v } from "convex/values";


export const listPending = authenticatedQuery({
  handler: async (ctx) => {
    const friends = await ctx.db
      .query("friends")
      .withIndex("by_user2_status", (q) =>
        q.eq("user2", ctx.user._id).eq("status", "pending")
      )
      .collect();
    return await mapWithUsers(ctx, friends, "user1");
  },
});


export const listAccepted = authenticatedQuery({
  handler: async (ctx) => {
    const friends1 = await ctx.db
      .query("friends")
      .withIndex("by_user1_status", (q) =>
        q.eq("user1", ctx.user._id).eq("status", "accepted")
      )
      .collect();
    const friends2 = await ctx.db
      .query("friends")
      .withIndex("by_user2_status", (q) =>
        q.eq("user2", ctx.user._id).eq("status", "accepted")
      )
      .collect();
    const friendsWithUser1 = await mapWithUsers(ctx, friends1, "user2");
    const friendsWithUser2 = await mapWithUsers(ctx, friends2, "user1");
    return [...friendsWithUser1, ...friendsWithUser2];
  },
});


export const listOutgoing = authenticatedQuery({
  handler: async (ctx) => {
    const friends = await ctx.db
      .query("friends")
      .withIndex("by_user1_status", (q) =>
        q.eq("user1", ctx.user._id).eq("status", "pending")
      )
      .collect();
    return await mapWithUsers(ctx, friends, "user2");
  },
});

/** Unfriend someone, or cancel a request you sent. */
export const remove = authenticatedMutation({
  args: { id: v.id("friends") },
  handler: async (ctx, { id }) => {
    const friend = await ctx.db.get(id);
    if (!friend) {
      throw new Error("Friend not found");
    }
    const isParticipant =
      friend.user1 === ctx.user._id || friend.user2 === ctx.user._id;
    const canRemove =
      friend.status === "accepted" ||
      (friend.status === "pending" && friend.user1 === ctx.user._id);
    if (!isParticipant || !canRemove) {
      throw new Error("Unauthorized");
    }
    await ctx.db.delete(id);
  },
});


export const friendRequest = authenticatedMutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();
    if (!user) {
      throw new Error("User not found");
    } else if (user._id === ctx.user._id) {
      throw new Error("Cannot add yourself");
    }

    const existing = await getFriendships(ctx, ctx.user._id, user._id);
    if (existing.some((f) => f.status === "accepted")) {
      throw new Error("You are already friends");
    }
    if (existing.some((f) => f.status === "pending" && f.user1 === ctx.user._id)) {
      throw new Error("Friend request already sent");
    }
    // They already asked us: treat our request as an acceptance.
    const incoming = existing.find(
      (f) => f.status === "pending" && f.user2 === ctx.user._id
    );
    if (incoming) {
      await ctx.db.patch(incoming._id, { status: "accepted" });
      return;
    }
    // A previously rejected pair can try again; reuse the row instead of duplicating it.
    const rejected = existing.find((f) => f.status === "rejected");
    if (rejected) {
      await ctx.db.patch(rejected._id, {
        user1: ctx.user._id,
        user2: user._id,
        status: "pending",
      });
      return;
    }
    await ctx.db.insert("friends", {
      user1: ctx.user._id,
      user2: user._id,
      status: "pending",
    });
  },
});

/** Every friendship row between two users, in either direction. */
export const getFriendships = async (
  ctx: QueryCtx,
  a: Id<"users">,
  b: Id<"users">
) => {
  const [forward, backward] = await Promise.all([
    ctx.db
      .query("friends")
      .withIndex("by_user1_status", (q) => q.eq("user1", a))
      .filter((q) => q.eq(q.field("user2"), b))
      .collect(),
    ctx.db
      .query("friends")
      .withIndex("by_user2_status", (q) => q.eq("user2", a))
      .filter((q) => q.eq(q.field("user1"), b))
      .collect(),
  ]);
  return [...forward, ...backward];
};

export const areFriends = async (
  ctx: QueryCtx,
  a: Id<"users">,
  b: Id<"users">
) => (await getFriendships(ctx, a, b)).some((f) => f.status === "accepted");


export const updateStatus = authenticatedMutation({
  args: {
    id: v.id("friends"),
    status: v.union(v.literal("accepted"), v.literal("rejected")),
  },
  handler: async (ctx, { id, status }) => {
    const friend = await ctx.db.get(id);
    if (!friend) {
      throw new Error("Friend not found");
    }
    const isParticipant =
      friend.user1 === ctx.user._id || friend.user2 === ctx.user._id;
    if (!isParticipant) {
      throw new Error("Unauthorized");
    }
    // Only the person who received a request may accept or reject it.
    if (friend.status === "pending" && friend.user2 !== ctx.user._id) {
      throw new Error("Only the recipient can answer a friend request");
    }
    await ctx.db.patch(id, { status });
  },
});


const mapWithUsers = async <
  k extends string,
  T extends { [key in k]: Id<"users"> },
>(
  ctx: QueryCtx,
  items: T[],
  key: k
) => {
  const result = await Promise.allSettled(
    items.map(async (item) => {
      const user = await ctx.db.get(item[key]);
      if (!user) {
        throw new Error("User not found");
      }
      return {
        ...item,
        user,
      };
    })
  );
  return result.filter((r) => r.status === "fulfilled").map((r) => r.value);
};
