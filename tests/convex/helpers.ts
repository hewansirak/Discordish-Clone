/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

export type TestConvex = ReturnType<typeof newTest>;

export function newTest() {
  return convexTest(schema, modules);
}

/** Insert a user and return an identity-bound client acting as them. */
export async function makeUser(t: TestConvex, username: string) {
  const clerkId = `clerk_${username}`;
  const id = await t.run((ctx) =>
    ctx.db.insert("users", { username, image: `https://img.test/${username}.png`, clerkId })
  );
  return { id, username, as: t.withIdentity({ subject: clerkId }) };
}

export type TestUser = Awaited<ReturnType<typeof makeUser>>;

/** Send a friend request from `a` to `b` and have `b` accept it. */
export async function befriend(a: TestUser, b: TestUser) {
  await a.as.mutation(api.functions.friend.friendRequest, { username: b.username });
  const [pending] = await b.as.query(api.functions.friend.listPending, {});
  await b.as.mutation(api.functions.friend.updateStatus, { id: pending._id, status: "accepted" });
}
