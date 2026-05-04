import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeUser, newTest } from "./helpers";

async function setup() {
  const t = newTest();
  const alice = await makeUser(t, "alice");
  const bob = await makeUser(t, "bob");
  return { t, alice, bob };
}

describe("friend requests", () => {
  it("lets the recipient accept a request", async () => {
    const { alice, bob } = await setup();
    await alice.as.mutation(api.functions.friend.friendRequest, { username: "bob" });
    const [pending] = await bob.as.query(api.functions.friend.listPending, {});
    await bob.as.mutation(api.functions.friend.updateStatus, { id: pending._id, status: "accepted" });

    const friends = await alice.as.query(api.functions.friend.listAccepted, {});
    expect(friends.map((f) => f.user.username)).toEqual(["bob"]);
  });

  it("does not let the sender accept their own request", async () => {
    const { t, alice, bob } = await setup();
    await alice.as.mutation(api.functions.friend.friendRequest, { username: "bob" });
    const [pending] = await bob.as.query(api.functions.friend.listPending, {});

    await expect(
      alice.as.mutation(api.functions.friend.updateStatus, { id: pending._id, status: "accepted" })
    ).rejects.toThrow(/recipient/i);
    const row = await t.run((ctx) => ctx.db.get(pending._id));
    expect(row?.status).toBe("pending");
  });

  it("does not let a stranger answer a request", async () => {
    const { t, alice, bob } = await setup();
    const carol = await makeUser(t, "carol");
    await alice.as.mutation(api.functions.friend.friendRequest, { username: "bob" });
    const [pending] = await bob.as.query(api.functions.friend.listPending, {});
    await expect(
      carol.as.mutation(api.functions.friend.updateStatus, { id: pending._id, status: "accepted" })
    ).rejects.toThrow(/unauthorized/i);
  });

  it("refuses to friend yourself or an unknown user", async () => {
    const { alice } = await setup();
    await expect(
      alice.as.mutation(api.functions.friend.friendRequest, { username: "alice" })
    ).rejects.toThrow(/yourself/i);
    await expect(
      alice.as.mutation(api.functions.friend.friendRequest, { username: "nobody" })
    ).rejects.toThrow(/not found/i);
  });

  it("requires sign-in", async () => {
    const { t } = await setup();
    await expect(t.query(api.functions.friend.listAccepted, {})).rejects.toThrow(/unauthorized/i);
  });
});
