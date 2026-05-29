import { v } from "convex/values";
import { authenticatedMutation, requireDmMember } from "./helpers";
import { isReactionEmoji } from "../lib/emoji";

/** Add the reaction if the caller hasn't reacted with it yet, otherwise remove it. */
export const toggle = authenticatedMutation({
  args: {
    message: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, { message, emoji }) => {
    if (!isReactionEmoji(emoji)) {
      throw new Error("That emoji is not available.");
    }
    const target = await ctx.db.get(message);
    if (!target) {
      throw new Error("Message does not exist.");
    }
    await requireDmMember(ctx, ctx.user, target.directMessage);

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_message_user_emoji", (q) =>
        q.eq("message", message).eq("user", ctx.user._id).eq("emoji", emoji)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("reactions", { message, user: ctx.user._id, emoji });
    }
  },
});
