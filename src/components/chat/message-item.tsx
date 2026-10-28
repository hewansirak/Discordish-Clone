"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CornerUpLeftIcon, MoreVerticalIcon, PencilIcon, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { ReactionBar } from "./reaction-bar";
import { formatDuration } from "@/lib/recording";
import Link from "next/link";
import type { ChatMessage } from "./types";

export type MessageActions = {
  /** Provide to show "Delete" in the message menu. */
  onDelete?: (message: ChatMessage) => void;
  /** Provide to show "Reply" in the message menu (available on everyone's messages). */
  onReply?: (message: ChatMessage) => void;
  /** Provide to enable emoji reactions. */
  onToggleReaction?: (message: ChatMessage, emoji: string) => void;
  /** Provide to show "Edit" in the message menu. */
  onEdit?: (message: ChatMessage, content: string) => Promise<void>;
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
  const canEdit = isOwn && Boolean(actions.onEdit) && Boolean(message.content);
  const canDelete = isOwn && Boolean(actions.onDelete);
  const hasMenu = canEdit || canDelete || Boolean(actions.onReply);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const saveEdit = async () => {
    const next = draft.trim();
    if (next === message.content) return setEditing(false);
    try {
      await actions.onEdit?.(message, next);
      setEditing(false);
    } catch (error) {
      toast.error("Could not edit message", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

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

        {message.replyTo && (
          <div className="mb-1 flex items-center gap-1 border-l-2 border-primary/50 pl-2 text-xs text-muted-foreground">
            <CornerUpLeftIcon className="size-3 shrink-0" />
            {message.replyTo.deleted ? (
              <span className="italic">Original message was deleted</span>
            ) : (
              <span className="truncate">
                <span className="font-semibold">{message.replyTo.senderName}</span>{" "}
                {message.replyTo.content}
              </span>
            )}
          </div>
        )}

        {editing ? (
          <div className="flex flex-col gap-1">
            <Input
              autoFocus
              value={draft}
              maxLength={2000}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void saveEdit();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <p className="text-xs text-muted-foreground">Enter to save · Esc to cancel</p>
          </div>
        ) : (
          message.content && (
            <p className="text-sm text-foreground leading-relaxed break-words whitespace-pre-wrap">
              {message.content}
              {message.editedAt && (
                <span className="ml-1 text-xs text-muted-foreground">(edited)</span>
              )}
            </p>
          )
        )}

        {actions.onToggleReaction && (
          <ReactionBar
            reactions={message.reactions ?? []}
            onToggle={(emoji) => actions.onToggleReaction?.(message, emoji)}
          />
        )}

        {message.hasVideo && (
          <div className="mt-2 max-w-md">
            {message.video?.url ? (
              <div className="overflow-hidden rounded-lg border border-border/50 bg-card/50">
                <video
                  src={message.video.url}
                  controls
                  preload="metadata"
                  playsInline
                  className="aspect-video w-full bg-black"
                />
                <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
                  <Link
                    href={`/watch/${message.video._id}`}
                    className="truncate font-medium hover:underline"
                  >
                    {message.video.title}
                  </Link>
                  {message.video.duration > 0 && (
                    <span className="text-muted-foreground">
                      {formatDuration(message.video.duration)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border/50 px-3 py-2 text-xs italic text-muted-foreground">
                This video was deleted.
              </p>
            )}
          </div>
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

      {hasMenu && (
        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/50">
                <MoreVerticalIcon className="size-4 text-muted-foreground" />
                <span className="sr-only">Message Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-card border border-border/50">
              {actions.onReply && (
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  onClick={() => actions.onReply?.(message)}
                >
                  <CornerUpLeftIcon className="w-4 h-4" />
                  Reply
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem
                  className="flex items-center gap-2"
                  onClick={() => {
                    setDraft(message.content);
                    setEditing(true);
                  }}
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit Message
                </DropdownMenuItem>
              )}
              {canDelete && (
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
