"use client";

import { Input } from "@/components/ui/input";
import { useQuery } from "convex/react";
import { SearchIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";

/** Header search box with a results dropdown for one conversation. */
export function MessageSearch({ directMessage }: { directMessage: Id<"directMessages"> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text), 250);
    return () => clearTimeout(timer);
  }, [text]);

  const results = useQuery(
    api.functions.message.search,
    open && debounced.trim().length >= 2 ? { directMessage, query: debounced } : "skip"
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ml-auto rounded-full p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      >
        <SearchIcon className="size-5" />
        <span className="sr-only">Search messages</span>
      </button>
    );
  }

  return (
    <div className="relative ml-auto w-72">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search this conversation"
          aria-label="Search messages"
        />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setText("");
          }}
          className="rounded-full p-1 text-muted-foreground hover:text-foreground"
        >
          <XIcon className="size-5" />
          <span className="sr-only">Close search</span>
        </button>
      </div>
      {results && (
        <ul className="absolute right-0 top-full z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-lg border border-border/50 bg-card p-1 shadow-lg">
          {results.length === 0 && (
            <li className="p-3 text-sm text-muted-foreground">No messages found</li>
          )}
          {results.map((message) => (
            <li key={message._id} className="rounded-md p-2 text-sm hover:bg-muted/50">
              <p className="text-xs text-muted-foreground">
                {message.sender?.username ?? "Deleted User"} ·{" "}
                {new Date(message._creationTime).toLocaleString()}
              </p>
              <p className="line-clamp-2 break-words">{message.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
