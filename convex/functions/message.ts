import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// Query to return all messages
// ctx helps us to access our database

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("messages").collect();
  },
});


// Help us interact

export const create = mutation({
  args: {
    sender: v.string(),
    content: v.string(),
  },
  handler: async (ctx, {sender, content}) => {
    await ctx.db.insert("messages", { sender, content});
  }
});