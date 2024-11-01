import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    image: v.string(),
    clerkId: v.string(),
  }).index("by_clerkId", ["clerkId"]),
  messages: defineTable({
    sender: v.string(),
    content: v.string(),
  }),
});
