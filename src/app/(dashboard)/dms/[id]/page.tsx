"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { LoaderIcon, MessageCircleIcon, MoreVerticalIcon, PlusIcon, SendIcon } from "lucide-react";
import { TrashIcon } from "@radix-ui/react-icons";
import { use, useRef, useState } from "react";
import { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { FunctionReturnType } from "convex/server";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export default function MessagePage({
  params,
}: {
  params: Promise<{ id: Id<"directMessages"> }>;
}) {
  const { id } = use(params);
  const messages = useQuery(api.functions.message.list, {
    directMessage: id,
  });

  const directMessage = useQuery(api.functions.dm.get, {
    id,
  });

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
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-background" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">
              {directMessage.user.username || "Guest"}
            </h1>
            <p className="text-sm text-muted-foreground">Online</p>
          </div>
        </div>
      </header>
      
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <MessageCircleIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Start your conversation
              </h3>
              <p className="text-muted-foreground">
                Send a message to {directMessage.user.username}
              </p>
            </div>
          ) : (
            messages?.map((message) => (
              <MessageItem key={message._id} message={message} />
            ))
          )}
        </div>
        <TypingIndicator directMessage={id} />
      </ScrollArea>
      
      <div className="border-t border-border/50 bg-background/95 backdrop-blur-sm">
        <MessageInput directMessage={id} />
      </div>
    </div>
  );
}

function TypingIndicator({
  directMessage,
}: {
  directMessage: Id<"directMessages">;
}) {
  const usernames = useQuery(api.functions.typing.list, { directMessage });

  if (!usernames || usernames.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span>{usernames.join(", ")} {usernames.length === 1 ? 'is' : 'are'} typing...</span>
    </div>
  );
}

type Message = FunctionReturnType<typeof api.functions.message.list>[number];

function MessageItem({ message }: { message: Message }) {
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
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        
        {message.content && (
          <p className="text-sm text-foreground leading-relaxed break-words">
            {message.content}
          </p>
        )}
        
        {message.attachment && (
          <div className="mt-2">
            <img
              src={message.attachment}
              width={300}
              height={300}
              alt="Attachment"
              className="rounded-lg border border-border/50 max-w-sm hover:scale-105 transition-transform duration-200 cursor-pointer"
            />
          </div>
        )}
      </div>
      
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <MessageActions message={message} />
      </div>
    </div>
  );
}

function MessageActions({ message }: { message: Message }) {
  const user = useQuery(api.functions.user.get);
  const removeMutation = useMutation(api.functions.message.remove);

  if (!user || message.sender?._id !== user._id) {
    return null;
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted/50">
          <MoreVerticalIcon className="size-4 text-muted-foreground" />
          <span className="sr-only">Message Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card border border-border/50">
        <DropdownMenuItem
          className="text-destructive hover:text-destructive hover:bg-destructive/10 flex items-center gap-2"
          onClick={() => removeMutation({ id: message._id })}
        >
          <TrashIcon className="w-4 h-4" />
          Delete Message
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MessageInput({
  directMessage,
}: {
  directMessage: Id<"directMessages">;
}) {
  const [content, setContent] = useState("");
  const sendMessage = useMutation(api.functions.message.create);
  const sendTypingIndicator = useMutation(api.functions.typing.upsert);
  const generateUploadUrl = useMutation(
    api.functions.message.generateUploadUrl
  );
  const [attachment, setAttachment] = useState<Id<"_storage">>();
  const [file, setFile] = useState<File>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUpLoading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFile(file);
    setIsUpLoading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, {
        method: "POST",
        body: file,
      });
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      if (!storageId) throw new Error("Image upload failed");
      setAttachment(storageId);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUpLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !attachment) return;
    try {
      await sendMessage({ directMessage, attachment, content });
      setContent("");
      setAttachment(undefined);
      setFile(undefined);
    } catch (error) {
      toast.error("Failed to send message");
    }
  };

  return (
    <>
      <form className="p-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3">
          {file && <ImagePreview file={file} isUploading={isUploading} />}
          
          <div className="flex items-end gap-3 bg-card/50 border border-border/50 rounded-xl p-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <PlusIcon className="w-5 h-5" />
              <span className="sr-only">Attach file</span>
            </Button>
            
            <Input
              placeholder="Type a message..."
              className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
                if (content.trim().length > 0) {
                  sendTypingIndicator({ directMessage });
                }
              }}
            />
            
            <Button
              type="submit"
              size="icon"
              className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-50"
              disabled={!content.trim() && !attachment}
            >
              <SendIcon className="w-4 h-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>
      </form>
      
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageUpload}
      />
    </>
  );
}

function ImagePreview({
  file,
  isUploading,
}: {
  file: File;
  isUploading: boolean;
}) {
  return (
    <div className="relative w-40 h-40 overflow-hidden rounded-lg border border-border/50 bg-card/50">
      <img
        src={URL.createObjectURL(file)}
        alt="Attachment preview"
        className="w-full h-full object-cover"
      />
      {isUploading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <LoaderIcon className="animate-spin h-6 w-6 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Uploading...</p>
          </div>
        </div>
      )}
    </div>
  );
}
