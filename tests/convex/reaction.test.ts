import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { REACTION_EMOJI, summarizeReactions } from "../../convex/lib/emoji";
import { befriend, makeUser, newTest } from "./helpers";

describe("summarizeReactions", () => {
  it("groups by emoji, counts, flags the viewer and keeps display order", () => {
    const rows = [
      { emoji: "🎉", user: "a" },
      { emoji: "👍", user: "a" },
      { emoji: "👍", user: "b" },
    ];
    expect(summarizeReactions(rows, "b")).toEqual([
      { emoji: "👍", count: 2, reacted: true },
      { emoji: "🎉", count: 1, reacted: false },
    ]);
  });
});

async function setup() {
  const t = newTest();
  const alice = await makeUser(t, "alice");
  const bob = await makeUser(t, "bob");
  await befriend(alice, bob);
  const dm = await alice.as.mutation(api.functions.dm.create, { username: "bob" });
  await alice.as.mutation(api.functions.message.create, { directMessage: dm, content: "hello" });
  const [message] = await alice.as.query(api.functions.message.list, { directMessage: dm });
  return { t, alice, bob, dm, message };
}

describe("reactions", () => {
  it("toggles a reaction on and off", async () => {
    const { alice, bob, dm, message } = await setup();
    const thumbs = REACTION_EMOJI[0];

    await bob.as.mutation(api.functions.reaction.toggle, { message: message._id, emoji: thumbs });
    await alice.as.mutation(api.functions.reaction.toggle, { message: message._id, emoji: thumbs });
    const [withReactions] = await bob.as.query(api.functions.message.list, { directMessage: dm });
    expect(withReactions.reactions).toEqual([{ emoji: thumbs, count: 2, reacted: true }]);

    await bob.as.mutation(api.functions.reaction.toggle, { message: message._id, emoji: thumbs });
    const [after] = await bob.as.query(api.functions.message.list, { directMessage: dm });
    expect(after.reactions).toEqual([{ emoji: thumbs, count: 1, reacted: false }]);
  });

  it("rejects unknown emoji and non-members", async () => {
    const { t, bob, message } = await setup();
    await expect(
      bob.as.mutation(api.functions.reaction.toggle, { message: message._id, emoji: "💩" })
    ).rejects.toThrow(/not available/i);

    const eve = await makeUser(t, "eve");
    await expect(
      eve.as.mutation(api.functions.reaction.toggle, { message: message._id, emoji: REACTION_EMOJI[0] })
    ).rejects.toThrow(/not a member/i);
  });

  it("removes reactions when the message is deleted", async () => {
    const { t, alice, message } = await setup();
    await alice.as.mutation(api.functions.reaction.toggle, { message: message._id, emoji: REACTION_EMOJI[1] });
    await alice.as.mutation(api.functions.message.remove, { id: message._id });
    expect(await t.run((ctx) => ctx.db.query("reactions").collect())).toHaveLength(0);
  });
});
