"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDuration } from "@/lib/recording";
import { cn } from "@/lib/utils";
import {
  EyeIcon,
  EyeOffIcon,
  GlobeIcon,
  LinkIcon,
  LockIcon,
  MoreVerticalIcon,
  PlayIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Id } from "../../../convex/_generated/dataModel";

export type LibraryVideo = {
  _id: Id<"videos">;
  _creationTime: number;
  title: string;
  description?: string;
  duration: number;
  visibility: "public" | "private";
  status: "uploading" | "ready" | "failed";
  url: string | null;
};

export function watchUrl(id: string) {
  return `${window.location.origin}/watch/${id}`;
}

export function VideoCard({
  video,
  onToggleVisibility,
  onDelete,
}: {
  video: LibraryVideo;
  onToggleVisibility: (video: LibraryVideo) => void;
  onDelete: (video: LibraryVideo) => void;
}) {
  const ready = video.status === "ready" && video.url;
  const isPublic = video.visibility === "public";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(watchUrl(video._id));
      toast.success(
        isPublic ? "Link copied" : "Link copied. Only you and chat members can open it."
      );
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <div className="group overflow-hidden rounded-xl border border-border/50 bg-card/50">
      <Link href={`/watch/${video._id}`} className="relative block aspect-video bg-muted/30">
        {ready ? (
          // The first frame doubles as the thumbnail.
          <video
            src={`${video.url}#t=0.1`}
            preload="metadata"
            muted
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {video.status === "failed" ? "Upload failed" : "Uploading…"}
          </div>
        )}
        {ready && (
          <>
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/30 group-hover:opacity-100">
              <PlayIcon className="size-10 text-white" />
            </span>
            {video.duration > 0 && (
              <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                {formatDuration(video.duration)}
              </span>
            )}
          </>
        )}
      </Link>

      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <Link href={`/watch/${video._id}`} className="block truncate font-semibold hover:underline">
            {video.title}
          </Link>
          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-xs text-muted-foreground",
              isPublic && "text-primary"
            )}
          >
            {isPublic ? <GlobeIcon className="size-3" /> : <LockIcon className="size-3" />}
            {isPublic ? "Public" : "Private"} ·{" "}
            {new Date(video._creationTime).toLocaleDateString()}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
              <MoreVerticalIcon className="size-4 text-muted-foreground" />
              <span className="sr-only">Video actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-card border border-border/50">
            {ready && (
              <DropdownMenuItem className="flex items-center gap-2" onClick={copyLink}>
                <LinkIcon className="size-4" />
                Copy link
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="flex items-center gap-2"
              onClick={() => onToggleVisibility(video)}
            >
              {isPublic ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              Make {isPublic ? "private" : "public"}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(video)}
            >
              <Trash2Icon className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
