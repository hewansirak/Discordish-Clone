import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { makeUser, newTest } from "./helpers";

async function setup() {
  const t = newTest();
  const owner = await makeUser(t, "owner");
  const bob = await makeUser(t, "bob");
  const carol = await makeUser(t, "carol");
  const server = await owner.as.mutation(api.functions.server.create, { name: "Study Group" });
  const info = await owner.as.query(api.functions.server.get, { id: server });
  return { t, owner, bob, carol, server, code: info.inviteCode! };
}

describe("servers", () => {
  it("creates a server with an owner membership and a #general channel", async () => {
    const { t, owner, server, code } = await setup();
    expect(code).toHaveLength(8);
    expect(await owner.as.query(api.functions.server.list, {})).toEqual([
      { _id: server, name: "Study Group", role: "owner" },
    ]);
    const channels = await owner.as.query(api.functions.channel.list, { server });
    expect(channels.map((c) => c.name)).toEqual(["general"]);
    expect(await t.run((ctx) => ctx.db.query("serverMembers").collect())).toHaveLength(1);
  });

  it("lets people join with a pasted invite code, once", async () => {
    const { bob, server, code } = await setup();
    const joined = await bob.as.mutation(api.functions.server.join, { inviteCode: ` ${code.toLowerCase()} ` });
    expect(joined).toBe(server);
    await bob.as.mutation(api.functions.server.join, { inviteCode: code });
    const members = await bob.as.query(api.functions.server.members, { id: server });
    expect(members.map((m) => [m.user.username, m.role])).toEqual([
      ["owner", "owner"],
      ["bob", "member"],
    ]);
    await expect(bob.as.mutation(api.functions.server.join, { inviteCode: "WRONG123" })).rejects.toThrow(
      /not valid/i
    );
  });

  it("hides server details from non-members and the invite code from regular members", async () => {
    const { bob, carol, server, code } = await setup();
    await expect(carol.as.query(api.functions.server.get, { id: server })).rejects.toThrow(/not a member/i);
    await bob.as.mutation(api.functions.server.join, { inviteCode: code });
    const asMember = await bob.as.query(api.functions.server.get, { id: server });
    expect(asMember.inviteCode).toBeUndefined();
    expect(asMember.role).toBe("member");
  });

  it("restricts rename and invite rotation to admins and above", async () => {
    const { owner, bob, carol, server, code } = await setup();
    await bob.as.mutation(api.functions.server.join, { inviteCode: code });
    await expect(bob.as.mutation(api.functions.server.rename, { id: server, name: "Hacked" })).rejects.toThrow(
      /admins/i
    );
    await expect(bob.as.mutation(api.functions.server.regenerateInvite, { id: server })).rejects.toThrow(/admins/i);

    await owner.as.mutation(api.functions.server.rename, { id: server, name: "Study Club" });
    const fresh = await owner.as.mutation(api.functions.server.regenerateInvite, { id: server });
    expect(fresh).not.toBe(code);
    // The old code stops working, the new one works.
    await expect(carol.as.mutation(api.functions.server.join, { inviteCode: code })).rejects.toThrow(/not valid/i);
    await expect(carol.as.mutation(api.functions.server.join, { inviteCode: fresh })).resolves.toBe(server);
    expect((await owner.as.query(api.functions.server.get, { id: server })).name).toBe("Study Club");
  });

  it("lets members leave but not the owner", async () => {
    const { owner, bob, server, code } = await setup();
    await bob.as.mutation(api.functions.server.join, { inviteCode: code });
    await bob.as.mutation(api.functions.server.leave, { id: server });
    expect(await bob.as.query(api.functions.server.list, {})).toEqual([]);
    await expect(owner.as.mutation(api.functions.server.leave, { id: server })).rejects.toThrow(/delete the server/i);
  });

  it("lets only the owner change roles, and admins kick members but not admins", async () => {
    const { owner, bob, carol, server, code } = await setup();
    await bob.as.mutation(api.functions.server.join, { inviteCode: code });
    await carol.as.mutation(api.functions.server.join, { inviteCode: code });

    await expect(
      bob.as.mutation(api.functions.server.setRole, { id: server, user: carol.id, role: "admin" })
    ).rejects.toThrow(/owner/i);
    await owner.as.mutation(api.functions.server.setRole, { id: server, user: bob.id, role: "admin" });
    await owner.as.mutation(api.functions.server.setRole, { id: server, user: carol.id, role: "admin" });

    await expect(bob.as.mutation(api.functions.server.kick, { id: server, user: carol.id })).rejects.toThrow(
      /permission/i
    );
    await expect(bob.as.mutation(api.functions.server.kick, { id: server, user: owner.id })).rejects.toThrow(
      /permission/i
    );
    await owner.as.mutation(api.functions.server.setRole, { id: server, user: carol.id, role: "member" });
    await bob.as.mutation(api.functions.server.kick, { id: server, user: carol.id });
    expect(await carol.as.query(api.functions.server.list, {})).toEqual([]);
  });

  it("deletes everything with the server, owner only", async () => {
    const { t, owner, bob, server, code } = await setup();
    await bob.as.mutation(api.functions.server.join, { inviteCode: code });
    const [channel] = await owner.as.query(api.functions.channel.list, { server });
    await owner.as.mutation(api.functions.channelMessage.send, { channel: channel._id, content: "hi" });

    await expect(bob.as.mutation(api.functions.server.remove, { id: server })).rejects.toThrow(/owner/i);
    await owner.as.mutation(api.functions.server.remove, { id: server });

    for (const table of ["servers", "serverMembers", "channels", "channelMessages"] as const) {
      expect(await t.run((ctx) => ctx.db.query(table).collect())).toHaveLength(0);
    }
  });
});
