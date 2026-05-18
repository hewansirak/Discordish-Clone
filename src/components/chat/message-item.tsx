"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVerticalIcon, Trash2 } from "lucide-react";
import Image from "next/image";
import type { ChatMessage } from "./types";

export type MessageActions = {
  /** Provide to show "Delete" in the message menu. */
  onDelete?: (message: ChatMessage) => void;
};

export function MessageItem({
  message,
  isOwn,
  actions,
}: {
  message: ChatMessage;
  isOwn: boolean;
  actions: MessageActions;
}) {
  const hasMenu = Boolean(actions.onDelete);

  return (
    <div className="message-hover group flex items-start gap-3 px-4 py-3 rounded-lg">
      <Avatar className="size-10 border border-border/50 flex-shrink-0">
        <AvatarImage
          src={message.sender?.image || "/default-avatar.png"}
          alt="User Avatar"
          className="object-cover"
        />
        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 font-semibold">
          {message.sender?.username?.[0]?.toUpperCase() ?? "U"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-semibold text-foreground text-sm">
            {message.sender?.username ?? "Deleted User"}
          </p>
          <p className="text-xs text-muted-foreground">
            {new Date(message._creationTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {message.content && (
          <p className="text-sm text-foreground leading-relaxed break-words whitespace-pre-wrap">
            {message.content}
          </p>
        )}

        {message.attachment && (
          <div className="mt-2">
            <Image
              src={message.attachment}
              width={300}
              height={300}
              alt="Attachment"
              className="rounded-lg border border-border/50 max-w-sm hover:scale-105 transition-transform duration-200 cursor-pointer"
            />
          </div>
        )}
      </div>

      {hasMenu && isOwn && (
        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/50">
                <MoreVerticalIcon className="size-4 text-muted-foreground" />
                <span className="sr-only">Message Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card border border-border/50">
              {actions.onDelete && (
                <DropdownMenuItem
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center gap-2"
                  onClick={() => actions.onDelete?.(message)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Message
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
