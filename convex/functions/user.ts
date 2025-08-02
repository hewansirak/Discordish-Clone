import { v } from "convex/values";
import {
  internalMutation,
  MutationCtx,
  query,
  QueryCtx,
} from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const get = query({
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

// Sample user data for creating realistic friends
const sampleFriends = [
  {
    username: "AlexRider",
    image:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    clerkId: "sample_clerk_1",
  },
  {
    username: "SarahChen",
    image:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    clerkId: "sample_clerk_2",
  },
  {
    username: "MikeDev",
    image:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    clerkId: "sample_clerk_3",
  },
  {
    username: "EmmaDesign",
    image:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    clerkId: "sample_clerk_4",
  },
  {
    username: "JakeGamer",
    image:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    clerkId: "sample_clerk_5",
  },
  {
    username: "LunaArtist",
    image:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
    clerkId: "sample_clerk_6",
  },
];

// Sample messages for conversations
const sampleMessages = [
  "Hey! How's it going?",
  "Just finished that project we were working on!",
  "Want to grab coffee later?",
  "Did you see the new update?",
  "Thanks for the help yesterday!",
  "What do you think about the new design?",
  "Are you free this weekend?",
  "Great work on the presentation!",
  "Can you review this code for me?",
  "Let's catch up soon!",
  "The meeting went really well!",
  "I'm thinking of starting a new project",
  "Have you tried the new restaurant downtown?",
  "What's your take on the latest tech trends?",
  "We should collaborate on something together",
  "Thanks for the recommendation!",
  "How's your day going?",
  "I'm excited about the upcoming event",
  "Let me know if you need anything!",
  "That's a great idea!",
];

export const upsert = internalMutation({
  args: {
    username: v.string(),
    image: v.string(),
    clerkId: v.string(),
  },

  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (user) {
      await ctx.db.patch(user._id, {
        username: args.username,
        image: args.image,
      });
      return user._id;
    } else {
      // Create new user
      const userId = await ctx.db.insert("users", {
        username: args.username,
        image: args.image,
        clerkId: args.clerkId,
      });

      // Create sample friends and conversations for new users
      await createSampleDataForNewUser(ctx, userId);

      return userId;
    }
  },
});

async function createSampleDataForNewUser(
  ctx: MutationCtx,
  currentUserId: Id<"users">
) {
  // Create sample friend users
  const friendUserIds: Id<"users">[] = [];

  for (const friend of sampleFriends) {
    // Check if friend already exists
    let friendUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_Id", (q) => q.eq("clerkId", friend.clerkId))
      .unique();

    let friendUserId: Id<"users">;
    if (!friendUser) {
      friendUserId = await ctx.db.insert("users", friend);
    } else {
      friendUserId = friendUser._id;
    }

    friendUserIds.push(friendUserId);
  }

  // Create friend relationships (mix of accepted and pending)
  const friendRelationships = [
    {
      user1: currentUserId,
      user2: friendUserIds[0],
      status: "accepted" as const,
    },
    {
      user1: currentUserId,
      user2: friendUserIds[1],
      status: "accepted" as const,
    },
    {
      user1: currentUserId,
      user2: friendUserIds[2],
      status: "pending" as const,
    },
    {
      user1: currentUserId,
      user2: friendUserIds[3],
      status: "accepted" as const,
    },
    {
      user1: currentUserId,
      user2: friendUserIds[4],
      status: "pending" as const,
    },
    {
      user1: currentUserId,
      user2: friendUserIds[5],
      status: "accepted" as const,
    },
  ];

  for (const friendship of friendRelationships) {
    await ctx.db.insert("friends", friendship);
  }

  // Create direct messages and sample conversations
  const conversations = [
    [currentUserId, friendUserIds[0]], // Current user & Alex
    [currentUserId, friendUserIds[1]], // Current user & Sarah
    [currentUserId, friendUserIds[3]], // Current user & Emma
    [currentUserId, friendUserIds[5]], // Current user & Luna
  ];

  for (const [user1, user2] of conversations) {
    // Create direct message
    const dmId = await ctx.db.insert("directMessages", {});

    // Add members
    await ctx.db.insert("directMessageMembers", {
      directMessage: dmId,
      user: user1,
    });
    await ctx.db.insert("directMessageMembers", {
      directMessage: dmId,
      user: user2,
    });

    // Add sample messages (5-10 messages per conversation)
    const messageCount = Math.floor(Math.random() * 6) + 5;
    const users = [user1, user2];

    for (let i = 0; i < messageCount; i++) {
      const sender = users[i % 2]; // Alternate between users
      const message =
        sampleMessages[Math.floor(Math.random() * sampleMessages.length)];

      await ctx.db.insert("messages", {
        sender,
        content: message,
        directMessage: dmId,
      });
    }
  }
}

export const remove = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserByClerkId(ctx, args.clerkId);
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const getCurrentUser = async (ctx: QueryCtx | MutationCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }
  return await getUserByClerkId(ctx, identity.subject);
};

export const getUserByClerkId = async (
  ctx: QueryCtx | MutationCtx,
  clerkId: string
) => {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk_Id", (q) => q.eq("clerkId", clerkId))
    .unique();
};
