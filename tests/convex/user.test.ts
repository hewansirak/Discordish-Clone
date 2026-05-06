import { afterEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { newTest } from "./helpers";

afterEach(() => vi.unstubAllEnvs());

const profile = { username: "newbie", image: "https://img.test/n.png", clerkId: "clerk_newbie" };

describe("user upsert (Clerk webhook)", () => {
  it("creates a plain user without fake data by default", async () => {
    const t = newTest();
    await t.mutation(internal.functions.user.upsert, profile);

    const me = await t.withIdentity({ subject: "clerk_newbie" }).query(api.functions.user.get, {});
    expect(me?.username).toBe("newbie");
    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users).toHaveLength(1);
    const friends = await t.run((ctx) => ctx.db.query("friends").collect());
    expect(friends).toHaveLength(0);
  });

  it("seeds sample friends and chats only when SEED_DEMO_DATA=true", async () => {
    vi.stubEnv("SEED_DEMO_DATA", "true");
    const t = newTest();
    await t.mutation(internal.functions.user.upsert, profile);

    const friends = await t.run((ctx) => ctx.db.query("friends").collect());
    expect(friends.length).toBeGreaterThan(0);
    const dms = await t.run((ctx) => ctx.db.query("directMessages").collect());
    expect(dms.length).toBeGreaterThan(0);
  });

  it("updates an existing user instead of duplicating it", async () => {
    const t = newTest();
    await t.mutation(internal.functions.user.upsert, profile);
    await t.mutation(internal.functions.user.upsert, { ...profile, username: "renamed" });
    const users = await t.run((ctx) => ctx.db.query("users").collect());
    expect(users.map((u) => u.username)).toEqual(["renamed"]);
  });
});
