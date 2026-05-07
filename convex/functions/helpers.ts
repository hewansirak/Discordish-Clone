import {
  customCtx,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import { getCurrentUser } from "./user";
import { mutation, query, QueryCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export const authenticatedQuery = customQuery(
  query,
  customCtx(async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }
    return { user };
  })
);

export const authenticatedMutation = customMutation(
  mutation,
  customCtx(async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }
    return { user };
  })
);

/** Throws unless `user` is a member of the direct message. Returns the membership row. */
export async function requireDmMember(
  ctx: QueryCtx,
  user: Doc<"users">,
  directMessage: Id<"directMessages">
) {
  const member = await ctx.db
    .query("directMessageMembers")
    .withIndex("by_directMessage_user", (q) =>
      q.eq("directMessage", directMessage).eq("user", user._id)
    )
    .first();
  if (!member) {
    throw new Error("You are not a member of this direct message.");
  }
  return member;
}
