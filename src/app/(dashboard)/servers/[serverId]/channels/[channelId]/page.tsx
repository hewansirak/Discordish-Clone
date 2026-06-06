"use client";

import { MessageComposer } from "@/components/chat/message-composer";
import { MessageItem } from "@/components/chat/message-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery } from "convex/react";
import { HashIcon, LoaderIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";

export default function ChannelPage() {
  const { serverId, channelId } = useParams<{ serverId: string; channelId: string }>();
  const channel = channelId as Id<"channels">;
  const me = useQuery(api.functions.user.get);
  const server = useQuery(api.functions.server.get, { id: serverId as Id<"servers"> });
  const channels = useQuery(api.functions.channel.list, { server: serverId as Id<"servers"> });
  const messages = useQuery(api.functions.channelMessage.list, { channel });

  const send = useMutation(api.functions.channelMessage.send);
  const edit = useMutation(api.functions.channelMessage.edit);
  const remove = useMutation(api.functions.channelMessage.remove);
  const generateUploadUrl = useMutation(api.functions.message.generateUploadUrl);

  const bottomRef = useRef<HTMLDivElement>(null);
  const newestId = messages?.[messages.length - 1]?._id;
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [newestId]);

  const current = channels?.find((c) => c._id === channel);
  if (!messages || !current || !me || !server) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <LoaderIcon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const isModerator = server.role === "owner" || server.role === "admin";

  return (
    <div className="flex min-w-0 flex-1 flex-col max-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <header className="glass-effect flex items-center gap-2 border-b border-border/50 p-4">
        <HashIcon className="size-5 text-muted-foreground" />
        <h1 className="font-bold">{current.name}</h1>
      </header>

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-4 py-4">
          {messages.length === 0 && (
            <div className="py-16 text-center">
              <h2 className="text-lg font-semibold">Welcome to #{current.name}</h2>
              <p className="text-muted-foreground">This is the start of the channel.</p>
            </div>
          )}
          {messages.map((message) => {
            const isOwn = message.sender?._id === me._id;
            return (
              <MessageItem
                key={message._id}
                message={message}
                isOwn={isOwn || isModerator}
                actions={{
                  // Only the author may edit; moderators may delete anyone's message.
                  onEdit: isOwn
                    ? async (m, content) => {
                        await edit({ id: m._id as Id<"channelMessages">, content });
                      }
                    : undefined,
                  onDelete: (m) =>
                    remove({ id: m._id as Id<"channelMessages"> }).catch(() => toast.error("Could not delete message")),
                }}
              />
            );
          })}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>

      <div className="border-t border-border/50 bg-background/95">
        <MessageComposer
          placeholder={`Message #${current.name}`}
          generateUploadUrl={() => generateUploadUrl()}
          onSend={async ({ content, attachment }) => {
            await send({ channel, content, attachment });
          }}
        />
      </div>
    </div>
  );
}
