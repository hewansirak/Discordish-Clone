"use client";

import { useQuery } from "convex/react";
import { LoaderIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { ChannelList } from "./_components/channel-list";
import { MemberList } from "./_components/member-list";
import { ServerMenu } from "./_components/server-menu";

export default function ServerLayout({ children }: { children: React.ReactNode }) {
  const { serverId } = useParams<{ serverId: string }>();
  const id = serverId as Id<"servers">;
  const server = useQuery(api.functions.server.get, { id });
  const me = useQuery(api.functions.user.get);

  if (!server || !me) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoaderIcon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1">
      <div className="flex w-60 shrink-0 flex-col border-r border-border/50 bg-sidebar-background">
        <ServerMenu id={id} name={server.name} role={server.role} inviteCode={server.inviteCode} />
        <ChannelList server={id} role={server.role} />
      </div>
      <div className="flex min-w-0 flex-1">{children}</div>
      <MemberList server={id} myRole={server.role} myId={me._id} />
    </div>
  );
}
