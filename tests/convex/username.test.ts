import { describe, expect, it } from "vitest";
import { deriveUsername } from "../../convex/lib/username";

describe("deriveUsername", () => {
  it("prefers the Clerk username", () => {
    expect(deriveUsername({ id: "user_1", username: "hewan", first_name: "Hewan" })).toBe("hewan");
  });

  it("falls back to the email local part, then first name", () => {
    expect(
      deriveUsername({ id: "user_1", username: null, email_addresses: [{ email_address: "kal.b@example.com" }] })
    ).toBe("kal.b");
    expect(deriveUsername({ id: "user_1", username: null, first_name: "Sara Lee" })).toBe("SaraLee");
  });

  it("uses an id-based handle as a last resort", () => {
    expect(deriveUsername({ id: "user_2abcdefghij", username: null })).toBe("user_cdefghij");
  });

  it("strips unsafe characters and caps the length", () => {
    expect(deriveUsername({ id: "u", username: "<b>hi!</b>" })).toBe("bhib");
    expect(deriveUsername({ id: "u", username: "x".repeat(50) })).toHaveLength(30);
  });
});
