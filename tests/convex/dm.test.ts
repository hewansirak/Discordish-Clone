import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { befriend, makeUser, newTest } from "./helpers";

describe("direct messages", () => {
  it("creates a DM between friends and reuses it", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    const bob = await makeUser(t, "bob");
    await befriend(alice, bob);

    const first = await alice.as.mutation(api.functions.dm.create, { username: "bob" });
    const again = await bob.as.mutation(api.functions.dm.create, { username: "alice" });
    expect(again).toBe(first);

    const list = await alice.as.query(api.functions.dm.list, {});
    expect(list.map((d) => d.user.username)).toEqual(["bob"]);
  });

  it("refuses to start a DM with someone who is not a friend", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    await makeUser(t, "stranger");
    await expect(
      alice.as.mutation(api.functions.dm.create, { username: "stranger" })
    ).rejects.toThrow(/friend/i);
  });

  it("does not leak a DM to non-members", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    const bob = await makeUser(t, "bob");
    const eve = await makeUser(t, "eve");
    await befriend(alice, bob);
    const id = await alice.as.mutation(api.functions.dm.create, { username: "bob" });
    await expect(eve.as.query(api.functions.dm.get, { id })).rejects.toThrow(/not a member/i);
  });
});
