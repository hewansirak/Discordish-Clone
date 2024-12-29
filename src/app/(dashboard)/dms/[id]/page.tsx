"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { MoreVerticalIcon } from "lucide-react";
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { TrashIcon } from "@radix-ui/react-icons";

export default function MessagePage({ params }: { params: { id: string } }) {
  const user = useQuery(api.functions.user.get);

  if (!user) {
    return <p>Loading...</p>;
  }

  return (
    <div className="flex flex-1 flex-col divide-y max-h-screen">
      <header className="flex items-center gap-2 p-4">
        <Avatar className="size-8 border">
          <AvatarImage src={user.image || "/default-avatar.png"} />
          <AvatarFallback />
        </Avatar>
        <h1 className="font-semibold">{user.username || "Guest"}</h1>
      </header>
      <ScrollArea className="h-full py-4">
        <MessageItem />
      </ScrollArea>
    </div>
  );
}

function MessageItem() {
  const user = useQuery(api.functions.user.get);

  if (!user) {
    return null;
  }

  return (
    <div className="flex items-center px-4 gap-2">
      <Avatar className="size-8 border">
        <AvatarImage src={user!.image || "/default-avatar.png"} />
        <AvatarFallback />
      </Avatar>
      <div className="flex flex-col mr-auto">
        <p className="text-xs text-muted-foreground">{user!.username}</p>
        <p className="text-sm">Hello, World!!</p>
      </div>
      <MessageActions />
    </div>
  );
}

function MessageActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <MoreVerticalIcon className="size-4 text-muted">
          <span className="sr-only">Message Action</span>
        </MoreVerticalIcon>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem className="text-destructive">
          <TrashIcon />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
