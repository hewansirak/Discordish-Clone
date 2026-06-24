import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { UPLOAD_LIMIT } from "../../convex/functions/videos";
import { befriend, makeUser, newTest, TestConvex, TestUser } from "./helpers";

/** Run the full create -> upload -> finalize flow and return the video id. */
async function makeVideo(
  t: TestConvex,
  owner: TestUser,
  options: { title?: string; visibility?: "public" | "private"; type?: string } = {}
) {
  const id = await owner.as.mutation(api.functions.videos.create, {
    title: options.title ?? "Demo",
    duration: 12,
    visibility: options.visibility ?? "private",
  });
  const storageId = await t.run((ctx) =>
    ctx.storage.store(new Blob(["video-bytes"], { type: options.type ?? "video/webm" }))
  );
  const result = await owner.as.mutation(api.functions.videos.finalize, { id, storageId });
  return { id, storageId, result };
}

async function setupDm() {
  const t = newTest();
  const alice = await makeUser(t, "alice");
  const bob = await makeUser(t, "bob");
  const eve = await makeUser(t, "eve");
  await befriend(alice, bob);
  const dm = await alice.as.mutation(api.functions.dm.create, { username: "bob" });
  return { t, alice, bob, eve, dm };
}

async function setupServer() {
  const t = newTest();
  const owner = await makeUser(t, "owner");
  const bob = await makeUser(t, "bob");
  const carol = await makeUser(t, "carol");
  const eve = await makeUser(t, "eve");
  const server = await owner.as.mutation(api.functions.server.create, { name: "Team" });
  const { inviteCode } = await owner.as.query(api.functions.server.get, { id: server });
  await bob.as.mutation(api.functions.server.join, { inviteCode: inviteCode! });
  await carol.as.mutation(api.functions.server.join, { inviteCode: inviteCode! });
  const [general] = await owner.as.query(api.functions.channel.list, { server });
  return { t, owner, bob, carol, eve, server, channel: general._id };
}

const watch = (user: { as: TestUser["as"] } | null, t: TestConvex, id: Id<"videos">) =>
  user
    ? user.as.query(api.functions.videos.getForWatch, { id })
    : t.query(api.functions.videos.getForWatch, { id });

describe("saving videos", () => {
  it("creates a row, accepts the upload and lists it with a playback URL", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    const { id, result } = await makeVideo(t, alice, { title: "  Standup  " });
    expect(result).toEqual({ ok: true });

    const [video] = await alice.as.query(api.functions.videos.listMine, {});
    expect(video).toMatchObject({ _id: id, title: "Standup", status: "ready", visibility: "private" });
    expect(video.url).toBeTypeOf("string");
  });

  it("validates title and description", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    await expect(
      alice.as.mutation(api.functions.videos.create, { title: "  ", duration: 1, visibility: "private" })
    ).rejects.toThrow(/title/i);
    await expect(
      alice.as.mutation(api.functions.videos.create, {
        title: "x".repeat(101),
        duration: 1,
        visibility: "private",
      })
    ).rejects.toThrow(/too long/i);
  });

  it("rejects files that are not videos and deletes them", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    const { id, storageId, result } = await makeVideo(t, alice, { type: "text/plain" });
    expect(result).toMatchObject({ ok: false });
    expect(await t.run((ctx) => ctx.storage.getUrl(storageId))).toBeNull();
    const [video] = await alice.as.query(api.functions.videos.listMine, {});
    expect(video).toMatchObject({ _id: id, status: "failed", url: null });
  });

  it("only lets the owner finalize, and only once per file", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    const bob = await makeUser(t, "bob");
    const { id, storageId } = await makeVideo(t, alice);

    await expect(bob.as.mutation(api.functions.videos.finalize, { id, storageId })).rejects.toThrow(/do not own/i);
    await expect(alice.as.mutation(api.functions.videos.finalize, { id, storageId })).rejects.toThrow(
      /already saved/i
    );

    const second = await alice.as.mutation(api.functions.videos.create, {
      title: "Second",
      duration: 1,
      visibility: "private",
    });
    await expect(
      alice.as.mutation(api.functions.videos.finalize, { id: second, storageId })
    ).rejects.toThrow(/already attached/i);
  });

  it("can mark a reserved upload as failed", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    const id = await alice.as.mutation(api.functions.videos.create, {
      title: "Broken",
      duration: 1,
      visibility: "private",
    });
    await alice.as.mutation(api.functions.videos.markFailed, { id });
    const [video] = await alice.as.query(api.functions.videos.listMine, {});
    expect(video.status).toBe("failed");
  });

  it("rate limits uploads per user", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    const bob = await makeUser(t, "bob");
    for (let i = 0; i < UPLOAD_LIMIT; i++) await makeVideo(t, alice, { title: `v${i}` });
    await expect(
      alice.as.mutation(api.functions.videos.create, { title: "one more", duration: 1, visibility: "private" })
    ).rejects.toThrow(/too fast/i);
    // The limit is per user.
    await expect(makeVideo(t, bob)).resolves.toBeDefined();
  });

  it("requires sign-in for every authenticated function", async () => {
    const t = newTest();
    await expect(t.mutation(api.functions.videos.generateUploadUrl, {})).rejects.toThrow(/unauthorized/i);
    await expect(
      t.mutation(api.functions.videos.create, { title: "x", duration: 1, visibility: "public" })
    ).rejects.toThrow(/unauthorized/i);
    await expect(t.query(api.functions.videos.listMine, {})).rejects.toThrow(/unauthorized/i);
  });
});

describe("owner controls", () => {
  it("lets only the owner edit, toggle visibility and delete", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    const bob = await makeUser(t, "bob");
    const { id } = await makeVideo(t, alice);

    await expect(bob.as.mutation(api.functions.videos.update, { id, title: "mine" })).rejects.toThrow(/do not own/i);
    await expect(
      bob.as.mutation(api.functions.videos.update, { id, visibility: "public" })
    ).rejects.toThrow(/do not own/i);
    await expect(bob.as.mutation(api.functions.videos.remove, { id })).rejects.toThrow(/do not own/i);

    await alice.as.mutation(api.functions.videos.update, { id, title: "Renamed", visibility: "public" });
    const [video] = await alice.as.query(api.functions.videos.listMine, {});
    expect(video).toMatchObject({ title: "Renamed", visibility: "public" });
  });

  it("deleting a video deletes the stored file", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    const { id, storageId } = await makeVideo(t, alice);
    expect(await t.run((ctx) => ctx.storage.getUrl(storageId))).not.toBeNull();

    await alice.as.mutation(api.functions.videos.remove, { id });
    expect(await t.run((ctx) => ctx.storage.getUrl(storageId))).toBeNull();
    expect(await alice.as.query(api.functions.videos.listMine, {})).toHaveLength(0);
    await expect(alice.as.mutation(api.functions.videos.remove, { id })).rejects.toThrow(/does not exist/i);
  });

  it("searches only the caller's own videos by title", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    const bob = await makeUser(t, "bob");
    await makeVideo(t, alice, { title: "Quarterly planning" });
    await makeVideo(t, alice, { title: "Bug repro" });
    await makeVideo(t, bob, { title: "Planning secrets", visibility: "public" });

    const results = await alice.as.query(api.functions.videos.listMine, { search: "planning" });
    expect(results.map((v) => v.title)).toEqual(["Quarterly planning"]);
  });
});
