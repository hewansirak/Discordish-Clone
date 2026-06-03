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

  it("lets the sender edit a message and marks it as edited", async () => {
    const { alice, bob, dm } = await setup();
    await alice.as.mutation(api.functions.message.create, { directMessage: dm, content: "helo" });
    const [message] = await alice.as.query(api.functions.message.list, { directMessage: dm });
    expect(message.editedAt).toBeUndefined();

    await expect(
      bob.as.mutation(api.functions.message.edit, { id: message._id, content: "hacked" })
    ).rejects.toThrow(/not the sender/i);
    await expect(
      alice.as.mutation(api.functions.message.edit, { id: message._id, content: "  " })
    ).rejects.toThrow(/empty/i);

    await alice.as.mutation(api.functions.message.edit, { id: message._id, content: "hello" });
    const [edited] = await bob.as.query(api.functions.message.list, { directMessage: dm });
    expect(edited.content).toBe("hello");
    expect(edited.editedAt).toBeTypeOf("number");
  });

  it("does not mark a message edited when the text is unchanged", async () => {
    const { alice, dm } = await setup();
    await alice.as.mutation(api.functions.message.create, { directMessage: dm, content: "same" });
    const [message] = await alice.as.query(api.functions.message.list, { directMessage: dm });
    await alice.as.mutation(api.functions.message.edit, { id: message._id, content: "same" });
    const [after] = await alice.as.query(api.functions.message.list, { directMessage: dm });
    expect(after.editedAt).toBeUndefined();
  });

  it("supports replies with a preview of the original message", async () => {
    const { alice, bob, dm } = await setup();
    await alice.as.mutation(api.functions.message.create, { directMessage: dm, content: "lunch at noon?" });
    const [original] = await bob.as.query(api.functions.message.list, { directMessage: dm });
    await bob.as.mutation(api.functions.message.create, {
      directMessage: dm,
      content: "sounds good",
      replyTo: original._id,
    });

    const [, reply] = await alice.as.query(api.functions.message.list, { directMessage: dm });
    expect(reply.replyTo).toMatchObject({ senderName: "alice", content: "lunch at noon?", deleted: false });

    await alice.as.mutation(api.functions.message.remove, { id: original._id });
    const [orphan] = await alice.as.query(api.functions.message.list, { directMessage: dm });
    expect(orphan.replyTo).toMatchObject({ deleted: true });
  });

  it("rejects a reply to a message from another conversation", async () => {
    const { t, alice, dm } = await setup();
    const carol = await makeUser(t, "carol");
    await befriend(alice, carol);
    const otherDm = await alice.as.mutation(api.functions.dm.create, { username: "carol" });
    await alice.as.mutation(api.functions.message.create, { directMessage: otherDm, content: "secret" });
    const [foreign] = await alice.as.query(api.functions.message.list, { directMessage: otherDm });

    await expect(
      alice.as.mutation(api.functions.message.create, { directMessage: dm, content: "oops", replyTo: foreign._id })
    ).rejects.toThrow(/not in this conversation/i);
  });

  it("pages through a conversation newest first", async () => {
    const { alice, dm } = await setup();
    for (const word of ["a", "b", "c", "d", "e"]) {
      await alice.as.mutation(api.functions.message.create, { directMessage: dm, content: word });
    }
    const first = await alice.as.query(api.functions.message.listPage, {
      directMessage: dm,
      paginationOpts: { numItems: 2, cursor: null },
    });
    expect(first.page.map((m) => m.content)).toEqual(["e", "d"]);
    expect(first.isDone).toBe(false);

    const second = await alice.as.query(api.functions.message.listPage, {
      directMessage: dm,
      paginationOpts: { numItems: 10, cursor: first.continueCursor },
    });
    expect(second.page.map((m) => m.content)).toEqual(["c", "b", "a"]);
    expect(second.isDone).toBe(true);
  });

  it("does not page messages for non-members", async () => {
    const { t, dm } = await setup();
    const eve = await makeUser(t, "eve");
    await expect(
      eve.as.query(api.functions.message.listPage, {
        directMessage: dm,
        paginationOpts: { numItems: 5, cursor: null },
      })
    ).rejects.toThrow(/not a member/i);
  });

  it("searches only within the given conversation", async () => {
    const { t, alice, dm } = await setup();
    const carol = await makeUser(t, "carol");
    await befriend(alice, carol);
    const otherDm = await alice.as.mutation(api.functions.dm.create, { username: "carol" });

    await alice.as.mutation(api.functions.message.create, { directMessage: dm, content: "the deploy is green" });
    await alice.as.mutation(api.functions.message.create, { directMessage: dm, content: "lunch?" });
    await alice.as.mutation(api.functions.message.create, { directMessage: otherDm, content: "deploy secrets" });

    const hits = await alice.as.query(api.functions.message.search, { directMessage: dm, query: "deploy" });
    expect(hits.map((m) => m.content)).toEqual(["the deploy is green"]);
    expect(await alice.as.query(api.functions.message.search, { directMessage: dm, query: "d" })).toEqual([]);
  });

  it("does not let outsiders search a conversation", async () => {
    const { t, dm } = await setup();
    const eve = await makeUser(t, "eve");
    await expect(
      eve.as.query(api.functions.message.search, { directMessage: dm, query: "anything" })
    ).rejects.toThrow(/not a member/i);
  });
});
