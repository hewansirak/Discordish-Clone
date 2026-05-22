"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LoaderIcon, MessageCircleIcon } from "lucide-react";
import { use, useEffect, useRef } from "react";
import { Id } from "../../../../../convex/_generated/dataModel";
import { toast } from "sonner";
import { PresenceDot } from "@/components/presence-dot";
import { useOnlineUsers } from "@/hooks/use-presence";
import { MessageItem } from "@/components/chat/message-item";
import { MessageComposer } from "@/components/chat/message-composer";
import { TypingIndicator } from "@/components/chat/typing-indicator";

export default function MessagePage({
  params,
}: {
  params: Promise<{ id: Id<"directMessages"> }>;
}) {
  const { id } = use(params);
  const me = useQuery(api.functions.user.get);
  const messages = useQuery(api.functions.message.list, { directMessage: id });
  const directMessage = useQuery(api.functions.dm.get, { id });
  const typing = useQuery(api.functions.typing.list, { directMessage: id });
  const online = useOnlineUsers(directMessage ? [directMessage.user._id] : []);

  const sendMessage = useMutation(api.functions.message.create);
  const removeMessage = useMutation(api.functions.message.remove);
  const sendTyping = useMutation(api.functions.typing.upsert);
  const markRead = useMutation(api.functions.dm.markRead);
  const generateUploadUrl = useMutation(api.functions.message.generateUploadUrl);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messageCount = messages?.length ?? 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messageCount]);

  // Anything that arrives while this conversation is open counts as read.
  useEffect(() => {
    if (messageCount > 0 && document.visibilityState === "visible") {
      markRead({ id }).catch(() => {});
    }
  }, [id, messageCount, markRead]);

  if (!directMessage) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <LoaderIcon className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  const isOnline = online.has(directMessage.user._id);

  return (
    <div className="flex flex-1 flex-col max-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <header className="glass-effect border-b border-border/50 backdrop-blur-sm">
        <div className="flex items-center gap-3 p-4">
          <div className="relative">
            <Avatar className="size-10 border-2 border-border/50">
              <AvatarImage
                src={directMessage.user.image || "/default-avatar.png"}
                alt="User Avatar"
                className="object-cover"
              />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 font-semibold">
                {directMessage.user.username?.[0]?.toUpperCase() ?? "G"}
              </AvatarFallback>
            </Avatar>
            <PresenceDot online={isOnline} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">
              {directMessage.user.username || "Guest"}
            </h1>
            <p className="text-sm text-muted-foreground">{isOnline ? "Online" : "Offline"}</p>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <MessageCircleIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Start your conversation</h3>
              <p className="text-muted-foreground">Send a message to {directMessage.user.username}</p>
            </div>
          ) : (
            messages?.map((message) => (
              <MessageItem
                key={message._id}
                message={message}
                isOwn={message.sender?._id === me?._id}
                actions={{
                  onDelete: (m) =>
                    removeMessage({ id: m._id as Id<"messages"> }).catch(() =>
                      toast.error("Could not delete message")
                    ),
                }}
              />
            ))
          )}
        </div>
        <TypingIndicator usernames={typing} />
        <div ref={bottomRef} />
      </ScrollArea>

      <div className="border-t border-border/50 bg-background/95 backdrop-blur-sm">
        <MessageComposer
          generateUploadUrl={() => generateUploadUrl()}
          onSend={async ({ content, attachment }) => {
            await sendMessage({ directMessage: id, content, attachment });
          }}
          onTyping={() => void sendTyping({ directMessage: id })}
        />
      </div>
    </div>
  );
}
