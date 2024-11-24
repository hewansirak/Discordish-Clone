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

function MessageItem() {
  const user = useQuery(api.functions.user.get);

  return (
    <div className="flex items-center px-4 gap-2">
      <Avatar className="size-8 border">
        <AvatarImage src={user!.image} />
        <AvatarFallback />
      </Avatar>
      <div className="flex flex-col">
        <p className="text-xs text-muted-foreground">{user!.username}</p>
        <p className="text-sm">Hello</p>
      </div>
    </div>
  );
}
