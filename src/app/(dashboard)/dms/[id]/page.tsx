"use client";

import { useQuery } from "convex/react";
import { use } from "react";
import { api } from "../../../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

export default async function MessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const user = useQuery(api.functions.user.get);

  if (!user) {
    return null;
  }
  return (
    <div className="flex flex-1 flex-col divide-y max-h-screen">
      <header className="flex items-center gap-2 p-4">
        <Avatar className="size-8 border">
          <AvatarImage src={user.image} />
          <AvatarFallback />
        </Avatar>
        <h1 className="font-semibold">{user.username}</h1>
      </header>
      <ScrollArea className="h-full">
        <MessageItem />
      </ScrollArea>
    </div>
  );
}

function MessageItem() {

  // TODO : Add message item component
}
