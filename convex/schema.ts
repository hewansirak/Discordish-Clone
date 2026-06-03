import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    username: v.string(),
    image: v.string(),
    clerkId: v.string(),
  })
    .index("by_clerk_Id", ["clerkId"])
    .index("by_username", ["username"]),
  friends: defineTable({
    user1: v.id("users"),
    user2: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
  })
    .index("by_user1_status", ["user1", "status"])
    .index("by_user2_status", ["user2", "status"]),
  directMessages: defineTable({}),
  directMessageMembers: defineTable({
    directMessage: v.id("directMessages"),
    user: v.id("users"),
    // Messages from others after this time count as unread.
    lastReadAt: v.optional(v.number()),
  })
    .index("by_directMessage", ["directMessage"])
    .index("by_user", ["user"])
    .index("by_directMessage_user", ["directMessage", "user"]),
  messages: defineTable({
    sender: v.id("users"),
    content: v.string(),
    directMessage: v.id("directMessages"),
    attachment: v.optional(v.id("_storage")),
    editedAt: v.optional(v.number()),
    replyTo: v.optional(v.id("messages")),
  })
    .index("by_directMessage", ["directMessage"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["directMessage"],
    }),
  servers: defineTable({
    name: v.string(),
    owner: v.id("users"),
    inviteCode: v.string(),
  }).index("by_inviteCode", ["inviteCode"]),
  serverMembers: defineTable({
    server: v.id("servers"),
    user: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("admin"), v.literal("member")),
  })
    .index("by_server", ["server"])
    .index("by_user", ["user"])
    .index("by_server_user", ["server", "user"]),
  channels: defineTable({
    server: v.id("servers"),
    name: v.string(),
  }).index("by_server", ["server"]),
  channelMessages: defineTable({
    channel: v.id("channels"),
    server: v.id("servers"),
    sender: v.id("users"),
    content: v.string(),
    attachment: v.optional(v.id("_storage")),
    editedAt: v.optional(v.number()),
  }).index("by_channel", ["channel"]),
  reactions: defineTable({
    message: v.id("messages"),
    user: v.id("users"),
    emoji: v.string(),
  })
    .index("by_message", ["message"])
    .index("by_message_user_emoji", ["message", "user", "emoji"]),
  presence: defineTable({
    user: v.id("users"),
    lastSeen: v.number(),
  }).index("by_user", ["user"]),
  typingIndicators: defineTable({
    user: v.id("users"),
    directMessage: v.id("directMessages"),
    expiresAt: v.number(),
  })
    .index("by_directMessage", ["directMessage"])
    .index("by_user_directMessage", ["user", "directMessage"]),
});
