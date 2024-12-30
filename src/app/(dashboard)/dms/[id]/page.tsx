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
import { LoaderIcon, MoreVerticalIcon, PlusIcon, SendIcon } from "lucide-react";
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
    return <p>Loading...</p>;
  }

  return (
    <div className="flex flex-1 flex-col divide-y max-h-screen">
      <header className="flex items-center gap-2 p-4">
        <Avatar className="size-8 border">
          <AvatarImage
            src={directMessage.user.image || "/default-avatar.png"}
            alt="User Avatar"
          />
          <AvatarFallback>
            {directMessage.user.username?.[0] ?? "G"}
          </AvatarFallback>
        </Avatar>

        <h1 className="font-semibold">
          {directMessage.user.username || "Guest"}
        </h1>
      </header>
      <ScrollArea className="h-full py-4">
        {messages?.map((message) => (
          <MessageItem key={message._id} message={message} />
        ))}
      </ScrollArea>
      <MessageInput directMessage={id} />
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
    <div className="text-sm text-muted-foreground px-4 py-2">
      {usernames.join(", ")} is typing...
    </div>
  );
}

type Message = FunctionReturnType<typeof api.functions.message.list>[number];

function MessageItem({ message }: { message: Message }) {
  return (
    <div className="flex items-center px-4 gap-2 py-2">
      <Avatar>
        <AvatarImage
          src={message.sender?.image || "/default-avatar.png"}
          alt="User Avatar"
        />
        <AvatarFallback>{message.sender?.username?.[0] ?? "U"}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col mr-auto">
        <p className="text-xs text-muted-foreground">
          {message.sender?.username ?? "Deleted User"}
        </p>
        <p className="text-sm">{message.content}</p>
        {message.attachment && (
          <img
            src={message.attachment || "/default-avatar.png"}
            width={300}
            height={300}
            alt="Attachment"
            className="rounded border overflow-hidden"
          />
        )}
      </div>
      <MessageActions message={message} />
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
      <DropdownMenuTrigger>
        <MoreVerticalIcon className="size-4 text-muted">
          <span className="sr-only">Message Action</span>
        </MoreVerticalIcon>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          className="text-destructive"
          onClick={() => removeMutation({ id: message._id })}
        >
          <TrashIcon />
          Delete
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
      <form className="flex items-end gap-2 p-4" onSubmit={handleSubmit}>
        <Button
          type="button"
          size="icon"
          onClick={() => {
            fileInputRef.current?.click();
          }}
        >
          <PlusIcon />
          <span className="sr-only">Attach</span>
        </Button>
        <div className="flex flex-col flex-1 gap-2">
          {file && <ImagePreview file={file} isUploading={isUploading} />}
          <Input
            placeholder="Message"
            className="flex-1 bg-background"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={() => {
              if (content.trim().length > 0) {
                sendTypingIndicator({ directMessage });
              }
            }}
          />
        </div>
        <Button size="icon">
          <SendIcon />
          <span className="sr-only">Send</span>
        </Button>
      </form>
      <input
        type="file"
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
    <div className="relative size-40 overflow-hidden rounded border">
      <img
        src={URL.createObjectURL(file)}
        width={300}
        height={300}
        alt="Attachment"
        className="rounded border overflow-hidden"
      />
      {isUploading && (
        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
          <LoaderIcon className="animate-spin size-8 " />
        </div>
      )}
    </div>
  );
}
