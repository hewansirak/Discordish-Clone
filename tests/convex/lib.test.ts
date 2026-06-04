import { describe, expect, it } from "vitest";
import { generateInviteCode, INVITE_CODE_LENGTH, normalizeInviteCode } from "../../convex/lib/invite";
import { normalizeChannelName, validateServerName } from "../../convex/lib/names";
import {
  canChangeRoles,
  canDeleteOthersMessages,
  canDeleteServer,
  canKick,
  canManageChannels,
  canManageServer,
} from "../../convex/lib/permissions";

describe("permissions", () => {
  it("gives admins moderation rights but not ownership rights", () => {
    expect(canManageChannels("member")).toBe(false);
    expect(canManageChannels("admin")).toBe(true);
    expect(canManageServer("admin")).toBe(true);
    expect(canDeleteOthersMessages("admin")).toBe(true);
    expect(canDeleteServer("admin")).toBe(false);
    expect(canChangeRoles("admin")).toBe(false);
    expect(canDeleteServer("owner")).toBe(true);
    expect(canChangeRoles("owner")).toBe(true);
  });

  it("only lets someone kick a strictly lower role, and members cannot kick", () => {
    expect(canKick("owner", "admin")).toBe(true);
    expect(canKick("admin", "member")).toBe(true);
    expect(canKick("admin", "admin")).toBe(false);
    expect(canKick("admin", "owner")).toBe(false);
    expect(canKick("member", "member")).toBe(false);
  });
});

describe("names", () => {
  it("normalizes channel names", () => {
    expect(normalizeChannelName("  Dev Chat!! ")).toBe("dev-chat");
    expect(normalizeChannelName("General")).toBe("general");
    expect(normalizeChannelName("a".repeat(60))).toHaveLength(40);
    expect(() => normalizeChannelName(" !!! ")).toThrow(/letter or number/);
  });

  it("validates server names", () => {
    expect(validateServerName("  My   Server ")).toBe("My Server");
    expect(() => validateServerName("x")).toThrow(/2-50/);
    expect(() => validateServerName("x".repeat(51))).toThrow(/2-50/);
  });
});

describe("invite codes", () => {
  it("generates readable codes of the right length", () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(INVITE_CODE_LENGTH);
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]+$/);
  });

  it("is deterministic for a given random source", () => {
    expect(generateInviteCode(() => 0)).toBe("AAAAAAAA");
  });

  it("normalizes pasted codes", () => {
    expect(normalizeInviteCode(" abcd-2345 ")).toBe("ABCD2345");
  });
});
