import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { isOnline, ONLINE_WINDOW_MS } from "../../convex/lib/presence";
import { befriend, makeUser, newTest } from "./helpers";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("isOnline", () => {
  it("is true only inside the window", () => {
    expect(isOnline(1000, 1000 + ONLINE_WINDOW_MS - 1)).toBe(true);
    expect(isOnline(1000, 1000 + ONLINE_WINDOW_MS)).toBe(false);
    expect(isOnline(null, 5)).toBe(false);
  });
});

describe("presence", () => {
  it("records one row per user and updates it on every heartbeat", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    await alice.as.mutation(api.functions.presence.heartbeat, {});
    vi.setSystemTime(Date.now() + 10_000);
    await alice.as.mutation(api.functions.presence.heartbeat, {});
    const rows = await t.run((ctx) => ctx.db.query("presence").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].lastSeen).toBe(Date.now());
  });

  it("shows presence for yourself and friends, hides it for strangers", async () => {
    const t = newTest();
    const alice = await makeUser(t, "alice");
    const bob = await makeUser(t, "bob");
    const eve = await makeUser(t, "eve");
    await befriend(alice, bob);
    await bob.as.mutation(api.functions.presence.heartbeat, {});
    await eve.as.mutation(api.functions.presence.heartbeat, {});
    await alice.as.mutation(api.functions.presence.heartbeat, {});

    const result = await alice.as.query(api.functions.presence.get, {
      users: [alice.id, bob.id, eve.id, bob.id],
    });
    const byUser = Object.fromEntries(result.map((r) => [r.user, r.lastSeen]));
    expect(result).toHaveLength(3); // duplicates collapsed
    expect(byUser[alice.id]).not.toBeNull();
    expect(byUser[bob.id]).not.toBeNull();
    expect(byUser[eve.id]).toBeNull();
  });
});
