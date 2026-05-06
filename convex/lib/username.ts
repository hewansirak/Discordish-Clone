type ClerkUserLike = {
  id: string;
  username?: string | null;
  first_name?: string | null;
  email_addresses?: { email_address: string }[];
};

const MAX_LENGTH = 30;

function sanitize(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9_.-]+/g, "")
    .slice(0, MAX_LENGTH);
}

/**
 * Clerk users are not required to have a username. Fall back to the email
 * local part, then first name, then a stable id-based handle, so the webhook
 * never creates a user with an empty or missing username.
 */
export function deriveUsername(user: ClerkUserLike): string {
  const candidates = [
    user.username ?? "",
    user.email_addresses?.[0]?.email_address.split("@")[0] ?? "",
    user.first_name ?? "",
  ];
  for (const candidate of candidates) {
    const clean = sanitize(candidate);
    if (clean.length >= 2) return clean;
  }
  return `user_${sanitize(user.id).slice(-8)}`;
}
