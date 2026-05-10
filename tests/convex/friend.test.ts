import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { befriend, makeUser, newTest } from "./helpers";

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

  it("rejects duplicate requests and requests to existing friends", async () => {
    const { alice, bob } = await setup();
    await alice.as.mutation(api.functions.friend.friendRequest, { username: "bob" });
    await expect(
      alice.as.mutation(api.functions.friend.friendRequest, { username: "bob" })
    ).rejects.toThrow(/already/i);

    const [pending] = await bob.as.query(api.functions.friend.listPending, {});
    await bob.as.mutation(api.functions.friend.updateStatus, { id: pending._id, status: "accepted" });
    await expect(
      bob.as.mutation(api.functions.friend.friendRequest, { username: "alice" })
    ).rejects.toThrow(/already friends/i);
  });

  it("auto-accepts when both users request each other", async () => {
    const { alice, bob } = await setup();
    await alice.as.mutation(api.functions.friend.friendRequest, { username: "bob" });
    await bob.as.mutation(api.functions.friend.friendRequest, { username: "alice" });
    const friends = await bob.as.query(api.functions.friend.listAccepted, {});
    expect(friends).toHaveLength(1);
    expect(await bob.as.query(api.functions.friend.listPending, {})).toHaveLength(0);
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

  it("lists outgoing requests and lets the sender cancel one", async () => {
    const { t, alice, bob } = await setup();
    await alice.as.mutation(api.functions.friend.friendRequest, { username: "bob" });
    const outgoing = await alice.as.query(api.functions.friend.listOutgoing, {});
    expect(outgoing.map((f) => f.user.username)).toEqual(["bob"]);

    await expect(
      bob.as.mutation(api.functions.friend.remove, { id: outgoing[0]._id })
    ).rejects.toThrow(/unauthorized/i);
    await alice.as.mutation(api.functions.friend.remove, { id: outgoing[0]._id });
    expect(await bob.as.query(api.functions.friend.listPending, {})).toHaveLength(0);
    expect(await t.run((ctx) => ctx.db.query("friends").collect())).toHaveLength(0);
  });

  it("lets either friend remove an accepted friendship", async () => {
    const { alice, bob } = await setup();
    await befriend(alice, bob);
    const [row] = await bob.as.query(api.functions.friend.listAccepted, {});
    await bob.as.mutation(api.functions.friend.remove, { id: row._id });
    expect(await alice.as.query(api.functions.friend.listAccepted, {})).toHaveLength(0);
  });
});
