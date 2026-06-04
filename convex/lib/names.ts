const MIN_SERVER_NAME = 2;
const MAX_SERVER_NAME = 50;
const MAX_CHANNEL_NAME = 40;

export function validateServerName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < MIN_SERVER_NAME || name.length > MAX_SERVER_NAME) {
    throw new Error(`Server name must be ${MIN_SERVER_NAME}-${MAX_SERVER_NAME} characters.`);
  }
  return name;
}

/** Channel names are lowercase, dash-separated, like #general or #dev-chat. */
export function normalizeChannelName(raw: string): string {
  const name = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_CHANNEL_NAME)
    .replace(/-+$/g, "");
  if (!name) {
    throw new Error("Channel name needs at least one letter or number.");
  }
  return name;
}
