import { convexTest } from "convex-test";
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
