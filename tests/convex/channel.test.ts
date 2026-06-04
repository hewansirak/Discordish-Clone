import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeUser, newTest } from "./helpers";

async function setup() {
  const t = newTest();
  const owner = await makeUser(t, "owner");
  const bob = await makeUser(t, "bob");
  const server = await owner.as.mutation(api.functions.server.create, { name: "Team" });
  const { inviteCode } = await owner.as.query(api.functions.server.get, { id: server });
  await bob.as.mutation(api.functions.server.join, { inviteCode: inviteCode! });
  const [general] = await owner.as.query(api.functions.channel.list, { server });
  return { t, owner, bob, server, general };
}

describe("channels", () => {
  it("lets admins create channels with normalized unique names", async () => {
    const { owner, server } = await setup();
    await owner.as.mutation(api.functions.channel.create, { server, name: "Dev Chat" });
    const names = (await owner.as.query(api.functions.channel.list, { server })).map((c) => c.name);
    expect(names).toEqual(["general", "dev-chat"]);

    await expect(owner.as.mutation(api.functions.channel.create, { server, name: "DEV chat" })).rejects.toThrow(
      /already exists/i
    );
  });

  it("blocks regular members from managing channels", async () => {
    const { bob, server, general } = await setup();
    await expect(bob.as.mutation(api.functions.channel.create, { server, name: "random" })).rejects.toThrow(/admins/i);
    await expect(bob.as.mutation(api.functions.channel.rename, { id: general._id, name: "x1" })).rejects.toThrow(
      /admins/i
    );
    await expect(bob.as.mutation(api.functions.channel.remove, { id: general._id })).rejects.toThrow(/admins/i);
  });

  it("keeps at least one channel and deletes messages with a channel", async () => {
    const { t, owner, server, general } = await setup();
    await expect(owner.as.mutation(api.functions.channel.remove, { id: general._id })).rejects.toThrow(/at least one/i);

    const extra = await owner.as.mutation(api.functions.channel.create, { server, name: "extra" });
    await owner.as.mutation(api.functions.channelMessage.send, { channel: extra, content: "bye" });
    await owner.as.mutation(api.functions.channel.remove, { id: extra });
    expect(await t.run((ctx) => ctx.db.query("channelMessages").collect())).toHaveLength(0);
  });

  it("hides channels from people outside the server", async () => {
    const { t, server } = await setup();
    const eve = await makeUser(t, "eve");
    await expect(eve.as.query(api.functions.channel.list, { server })).rejects.toThrow(/not a member/i);
  });
});

describe("channel messages", () => {
  it("lets members chat and shows messages oldest first", async () => {
    const { owner, bob, general } = await setup();
    await owner.as.mutation(api.functions.channelMessage.send, { channel: general._id, content: "welcome" });
    await bob.as.mutation(api.functions.channelMessage.send, { channel: general._id, content: "thanks" });
    const messages = await bob.as.query(api.functions.channelMessage.list, { channel: general._id });
    expect(messages.map((m) => [m.sender?.username, m.content])).toEqual([
      ["owner", "welcome"],
      ["bob", "thanks"],
    ]);
  });

  it("validates content and keeps outsiders out", async () => {
    const { t, owner, general } = await setup();
    await expect(
      owner.as.mutation(api.functions.channelMessage.send, { channel: general._id, content: "  " })
    ).rejects.toThrow(/empty/i);
    const eve = await makeUser(t, "eve");
    await expect(
      eve.as.mutation(api.functions.channelMessage.send, { channel: general._id, content: "hi" })
    ).rejects.toThrow(/not a member/i);
    await expect(eve.as.query(api.functions.channelMessage.list, { channel: general._id })).rejects.toThrow(
      /not a member/i
    );
  });

  it("lets only the author edit, and admins delete other people's messages", async () => {
    const { owner, bob, general } = await setup();
    await bob.as.mutation(api.functions.channelMessage.send, { channel: general._id, content: "oops" });
    const [message] = await bob.as.query(api.functions.channelMessage.list, { channel: general._id });

    await expect(
      owner.as.mutation(api.functions.channelMessage.edit, { id: message._id, content: "mine now" })
    ).rejects.toThrow(/not the sender/i);
    await bob.as.mutation(api.functions.channelMessage.edit, { id: message._id, content: "fixed" });
    const [edited] = await owner.as.query(api.functions.channelMessage.list, { channel: general._id });
    expect(edited.content).toBe("fixed");
    expect(edited.editedAt).toBeTypeOf("number");

    await owner.as.mutation(api.functions.channelMessage.remove, { id: message._id });
    expect(await owner.as.query(api.functions.channelMessage.list, { channel: general._id })).toHaveLength(0);
  });

  it("does not let a regular member delete someone else's message", async () => {
    const { owner, bob, general } = await setup();
    await owner.as.mutation(api.functions.channelMessage.send, { channel: general._id, content: "rules" });
    const [message] = await owner.as.query(api.functions.channelMessage.list, { channel: general._id });
    await expect(bob.as.mutation(api.functions.channelMessage.remove, { id: message._id })).rejects.toThrow(
      /permission/i
    );
  });
});
