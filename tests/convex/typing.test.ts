import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../convex/_generated/api";
import { befriend, makeUser, newTest } from "./helpers";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

async function setup() {
  const t = newTest();
  const alice = await makeUser(t, "alice");
  const bob = await makeUser(t, "bob");
  await befriend(alice, bob);
  const dm = await alice.as.mutation(api.functions.dm.create, { username: "bob" });
  return { t, alice, bob, dm };
}

describe("typing indicators", () => {
  it("shows who else is typing, never the caller", async () => {
    const { alice, bob, dm } = await setup();
    await alice.as.mutation(api.functions.typing.upsert, { directMessage: dm });
    expect(await bob.as.query(api.functions.typing.list, { directMessage: dm })).toEqual(["alice"]);
    expect(await alice.as.query(api.functions.typing.list, { directMessage: dm })).toEqual([]);
  });

  it("ignores indicators that have expired even if cleanup has not run", async () => {
    const { alice, bob, dm } = await setup();
    await alice.as.mutation(api.functions.typing.upsert, { directMessage: dm });
    vi.setSystemTime(Date.now() + 6000);
    expect(await bob.as.query(api.functions.typing.list, { directMessage: dm })).toEqual([]);
  });

  it("only lets members of the conversation see or set typing state", async () => {
    const { t, dm } = await setup();
    const eve = await makeUser(t, "eve");
    await expect(eve.as.query(api.functions.typing.list, { directMessage: dm })).rejects.toThrow(/not a member/i);
    await expect(eve.as.mutation(api.functions.typing.upsert, { directMessage: dm })).rejects.toThrow(
      /not a member/i
    );
  });
});
