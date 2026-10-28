"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { watchUrl } from "@/components/video/video-card";
import { formatDuration } from "@/lib/recording";
import { useQuery } from "convex/react";
import { LinkIcon, LoaderIcon } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";

export default function WatchPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = use(params);
  // Public route: the server decides whether this viewer may see the video.
  const video = useQuery(api.functions.videos.getForWatch, { id: videoId });

  if (video === undefined) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <LoaderIcon className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (video === null) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 px-4 text-center">
        <h1 className="text-xl font-bold">Video not found</h1>
        <p className="text-muted-foreground">
          It may have been deleted, or it is private and you do not have access.
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/">Back to Discordish</Link>
        </Button>
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-4 px-4 py-6">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Discordish
        </Link>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            navigator.clipboard
              .writeText(watchUrl(videoId))
              .then(() => toast.success("Link copied"))
              .catch(() => toast.error("Could not copy the link"));
          }}
        >
          <LinkIcon className="mr-2 size-4" />
          Copy link
        </Button>
      </div>

      {video.url ? (
        <video
          src={video.url}
          controls
          playsInline
          className="aspect-video w-full rounded-xl border border-border/50 bg-black"
        />
      ) : (
        <div className="flex aspect-video items-center justify-center rounded-xl border border-border/50 text-muted-foreground">
          This video is not available yet.
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold">{video.title}</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          {video.owner && (
            <>
              <Avatar className="size-6 border border-border/50">
                <AvatarImage src={video.owner.image} />
                <AvatarFallback className="text-xs">{video.owner.username[0]}</AvatarFallback>
              </Avatar>
              <span>{video.owner.username}</span>
              <span>·</span>
            </>
          )}
          <span>{new Date(video._creationTime).toLocaleDateString()}</span>
          {video.duration > 0 && (
            <>
              <span>·</span>
              <span>{formatDuration(video.duration)}</span>
            </>
          )}
          {video.isOwner && (
            <>
              <span>·</span>
              <span className="capitalize">{video.visibility}</span>
            </>
          )}
        </div>
        {video.description && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{video.description}</p>
        )}
      </div>

      {video.transcript && (
        <section className="rounded-xl border border-border/50 bg-card/50 p-4">
          <h2 className="mb-2 font-semibold">Transcript</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {video.transcript}
          </p>
        </section>
      )}
    </main>
  );
}
