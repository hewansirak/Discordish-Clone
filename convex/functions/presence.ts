import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./helpers";
import { areFriends } from "./friend";

/** Called periodically by every open client; records that the user is around. */
export const heartbeat = authenticatedMutation({
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", (q) => q.eq("user", ctx.user._id))
      .first();
    const lastSeen = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { lastSeen });
    } else {
      await ctx.db.insert("presence", { user: ctx.user._id, lastSeen });
    }
  },
});

/**
 * Last heartbeat for each requested user. Only yourself and your friends are
 * visible; everyone else comes back as null so presence can't be used to snoop.
 */
export const get = authenticatedQuery({
  args: { users: v.array(v.id("users")) },
  handler: async (ctx, { users }) => {
    const unique = [...new Set(users)].slice(0, 100);
    return await Promise.all(
      unique.map(async (user) => {
        const visible = user === ctx.user._id || (await areFriends(ctx, ctx.user._id, user));
        if (!visible) return { user, lastSeen: null };
        const row = await ctx.db
          .query("presence")
          .withIndex("by_user", (q) => q.eq("user", user))
          .first();
        return { user, lastSeen: row?.lastSeen ?? null };
      })
    );
  },
});
