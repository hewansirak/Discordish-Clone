/** A user counts as online if their last heartbeat is newer than this. */
export const ONLINE_WINDOW_MS = 45_000;

/** How often the client should send a heartbeat. Must be well under the window. */
export const HEARTBEAT_INTERVAL_MS = 20_000;

export function isOnline(lastSeen: number | null | undefined, now: number): boolean {
  return lastSeen != null && now - lastSeen < ONLINE_WINDOW_MS;
}
