import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { befriend, makeUser, newTest } from "./helpers";

async function setup() {
  const t = newTest();
  const alice = await makeUser(t, "alice");
  const bob = await makeUser(t, "bob");
  await befriend(alice, bob);
  const dm = await alice.as.mutation(api.functions.dm.create, { username: "bob" });
  return { t, alice, bob, dm };
}

describe("messages", () => {
  it("sends and lists messages in order", async () => {
    const { alice, bob, dm } = await setup();
    await alice.as.mutation(api.functions.message.create, { directMessage: dm, content: "hi bob" });
    await bob.as.mutation(api.functions.message.create, { directMessage: dm, content: "hi alice" });

    const messages = await bob.as.query(api.functions.message.list, { directMessage: dm });
    expect(messages.map((m) => [m.sender?.username, m.content])).toEqual([
      ["alice", "hi bob"],
      ["bob", "hi alice"],
    ]);
  });

  it("trims whitespace and rejects empty or oversized messages", async () => {
    const { alice, dm } = await setup();
    await alice.as.mutation(api.functions.message.create, { directMessage: dm, content: "  padded  " });
    const [message] = await alice.as.query(api.functions.message.list, { directMessage: dm });
    expect(message.content).toBe("padded");

    await expect(
      alice.as.mutation(api.functions.message.create, { directMessage: dm, content: "   " })
    ).rejects.toThrow(/empty/i);
    await expect(
      alice.as.mutation(api.functions.message.create, { directMessage: dm, content: "x".repeat(2001) })
    ).rejects.toThrow(/2000/);
  });

  it("allows an attachment without text", async () => {
    const { t, alice, dm } = await setup();
    const storageId = await t.run((ctx) => ctx.storage.store(new Blob(["img"])));
    await alice.as.mutation(api.functions.message.create, {
      directMessage: dm,
      content: "",
      attachment: storageId,
    });
    const [message] = await alice.as.query(api.functions.message.list, { directMessage: dm });
    expect(message.attachment).toBeTruthy();
  });

  it("blocks non-members from reading or writing", async () => {
    const { t, dm } = await setup();
    const eve = await makeUser(t, "eve");
    await expect(
      eve.as.mutation(api.functions.message.create, { directMessage: dm, content: "hello" })
    ).rejects.toThrow(/not a member/i);
    await expect(eve.as.query(api.functions.message.list, { directMessage: dm })).rejects.toThrow(
      /not a member/i
    );
  });

  it("only lets the sender delete a message", async () => {
    const { alice, bob, dm } = await setup();
    await alice.as.mutation(api.functions.message.create, { directMessage: dm, content: "mine" });
    const [message] = await alice.as.query(api.functions.message.list, { directMessage: dm });

    await expect(bob.as.mutation(api.functions.message.remove, { id: message._id })).rejects.toThrow(
      /not the sender/i
    );
    await alice.as.mutation(api.functions.message.remove, { id: message._id });
    expect(await alice.as.query(api.functions.message.list, { directMessage: dm })).toHaveLength(0);
  });
});
