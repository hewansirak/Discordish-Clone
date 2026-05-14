"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { HEARTBEAT_INTERVAL_MS, isOnline } from "../../convex/lib/presence";

/** Tell the server we're here while the tab is visible. Mount once in the app shell. */
export function usePresenceHeartbeat() {
  const heartbeat = useMutation(api.functions.presence.heartbeat);

  useEffect(() => {
    const beat = () => {
      if (document.visibilityState === "visible") heartbeat().catch(() => {});
    };
    beat();
    const timer = setInterval(beat, HEARTBEAT_INTERVAL_MS);
    document.addEventListener("visibilitychange", beat);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [heartbeat]);
}

/** Set of the given users that are currently online. Re-evaluated every 10 seconds. */
export function useOnlineUsers(userIds: Id<"users">[]) {
  const key = userIds.join(",");
  const stableIds = useMemo(() => key.split(",").filter(Boolean) as Id<"users">[], [key]);
  const presence = useQuery(
    api.functions.presence.get,
    stableIds.length > 0 ? { users: stableIds } : "skip"
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);

  return useMemo(
    () => new Set((presence ?? []).filter((p) => isOnline(p.lastSeen, now)).map((p) => p.user)),
    [presence, now]
  );
}
