"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoaderIcon, PlusIcon, SendIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Id } from "../../../convex/_generated/dataModel";
import { ImagePreview } from "./image-preview";

const TYPING_REFRESH_MS = 2000;

export function MessageComposer({
  placeholder = "Type a message...",
  generateUploadUrl,
  onSend,
  onTyping,
  replyingTo,
  onCancelReply,
}: {
  placeholder?: string;
  generateUploadUrl: () => Promise<string>;
  onSend: (message: { content: string; attachment?: Id<"_storage"> }) => Promise<void>;
  /** Called at most every couple of seconds while the user types. */
  onTyping?: () => void;
  /** Shows a "Replying to" bar above the input. */
  replyingTo?: { senderName: string; content: string } | null;
  onCancelReply?: () => void;
}) {
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<Id<"_storage">>();
  const [file, setFile] = useState<File>();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastTypingSent = useRef(0);

  const canSend = (content.trim().length > 0 || Boolean(attachment)) && !isUploading;

  const clearAttachment = () => {
    setAttachment(undefined);
    setFile(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    setFile(picked);
    setIsUploading(true);
    try {
      const url = await generateUploadUrl();
      const res = await fetch(url, { method: "POST", body: picked });
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      if (!storageId) throw new Error("Image upload failed");
      setAttachment(storageId);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image");
      clearAttachment();
    } finally {
      setIsUploading(false);
    }
  };

  const submit = async () => {
    if (!canSend) return;
    try {
      await onSend({ content, attachment });
      setContent("");
      clearAttachment();
    } catch (error) {
      toast.error("Failed to send message", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <form
      className="p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="flex flex-col gap-3">
        {replyingTo && (
          <div className="flex items-center justify-between rounded-lg border border-border/50 bg-card/50 px-3 py-2 text-xs text-muted-foreground">
            <span className="truncate">
              Replying to <span className="font-semibold">{replyingTo.senderName}</span>:{" "}
              {replyingTo.content}
            </span>
            <button type="button" onClick={onCancelReply} className="ml-2 hover:text-foreground">
              <XIcon className="size-4" />
              <span className="sr-only">Cancel reply</span>
            </button>
          </div>
        )}
        {file && <ImagePreview file={file} isUploading={isUploading} onRemove={clearAttachment} />}

        <div className="flex items-end gap-3 bg-card/50 border border-border/50 rounded-xl p-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? <LoaderIcon className="w-5 h-5 animate-spin" /> : <PlusIcon className="w-5 h-5" />}
            <span className="sr-only">Attach image</span>
          </Button>

          <Input
            placeholder={placeholder}
            className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground"
            value={content}
            maxLength={2000}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
                return;
              }
              if (e.key === "Escape" && replyingTo) onCancelReply?.();
              if (onTyping && content.trim().length > 0 && Date.now() - lastTypingSent.current > TYPING_REFRESH_MS) {
                lastTypingSent.current = Date.now();
                onTyping();
              }
            }}
          />

          <Button
            type="submit"
            size="icon"
            className="h-8 w-8 rounded-full bg-primary hover:bg-primary/90 disabled:opacity-50"
            disabled={!canSend}
          >
            <SendIcon className="w-4 h-4" />
            <span className="sr-only">Send message</span>
          </Button>
        </div>
      </div>

      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleImageUpload}
      />
    </form>
  );
}
