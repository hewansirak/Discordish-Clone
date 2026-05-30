"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { SmilePlusIcon } from "lucide-react";
import { REACTION_EMOJI } from "../../../convex/lib/emoji";

type Reaction = { emoji: string; count: number; reacted: boolean };

/** Existing reactions as toggleable chips, plus a picker for adding a new one. */
export function ReactionBar({
  reactions,
  onToggle,
}: {
  reactions: Reaction[];
  onToggle: (emoji: string) => void;
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          type="button"
          aria-pressed={reaction.reacted}
          onClick={() => onToggle(reaction.emoji)}
          className={cn(
            "flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
            reaction.reacted
              ? "border-primary/60 bg-primary/15 text-foreground"
              : "border-border/50 bg-card/50 text-muted-foreground hover:bg-muted/50"
          )}
        >
          <span>{reaction.emoji}</span>
          <span>{reaction.count}</span>
        </button>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
          >
            <SmilePlusIcon className="size-4 text-muted-foreground" />
            <span className="sr-only">Add reaction</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="flex gap-1 bg-card border border-border/50 p-1">
          {REACTION_EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onToggle(emoji)}
              className="rounded p-1 text-lg hover:bg-muted"
            >
              {emoji}
            </button>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
