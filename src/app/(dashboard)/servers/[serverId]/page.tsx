"use client";

import { useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

/** Landing page of a server: jump to its first channel. */
export default function ServerHomePage() {
  const { serverId } = useParams<{ serverId: string }>();
  const channels = useQuery(api.functions.channel.list, { server: serverId as Id<"servers"> });
  const router = useRouter();

  useEffect(() => {
    if (channels && channels.length > 0) {
      router.replace(`/servers/${serverId}/channels/${channels[0]._id}`);
    }
  }, [channels, router, serverId]);

  return <div className="flex-1" />;
}
