"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordDialog } from "@/components/video/record-dialog";
import { LibraryVideo, VideoCard } from "@/components/video/video-card";
import { useVideoUpload } from "@/hooks/use-video-upload";
import { useMutation, useQuery } from "convex/react";
import { LoaderIcon, SearchIcon, VideoIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";

export default function VideosPage() {
  const [search, setSearch] = useState("");
  const [recording, setRecording] = useState(false);
  const videos = useQuery(api.functions.videos.listMine, { search: search || undefined });
  const upload = useVideoUpload();
  const update = useMutation(api.functions.videos.update);
  const remove = useMutation(api.functions.videos.remove);

  const toggleVisibility = (video: LibraryVideo) => {
    const visibility = video.visibility === "public" ? "private" : "public";
    update({ id: video._id, visibility }).catch(() => toast.error("Could not change visibility"));
  };

  const deleteVideo = (video: LibraryVideo) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return;
    remove({ id: video._id }).catch(() => toast.error("Could not delete the video"));
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-gradient-to-br from-background via-background to-muted/10">
      <header className="glass-effect flex flex-wrap items-center gap-3 border-b border-border/50 p-4">
        <VideoIcon className="size-5 text-muted-foreground" />
        <h1 className="font-bold">Videos</h1>
        <div className="relative ml-auto w-full max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your videos"
            className="pl-9"
          />
        </div>
        <Button onClick={() => setRecording(true)}>New video</Button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {videos === undefined ? (
          <div className="flex justify-center py-16">
            <LoaderIcon className="size-8 animate-spin text-primary" />
          </div>
        ) : videos.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-lg font-semibold">
              {search ? "No videos match your search" : "No videos yet"}
            </h2>
            <p className="text-muted-foreground">
              {search
                ? "Try a different title."
                : "Record your screen or upload a file to get started."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {videos.map((video) => (
              <VideoCard
                key={video._id}
                video={video}
                onToggleVisibility={toggleVisibility}
                onDelete={deleteVideo}
              />
            ))}
          </div>
        )}
      </div>

      <RecordDialog
        open={recording}
        onOpenChange={setRecording}
        title="New video"
        showDetails
        allowFileUpload
        onConfirm={async (video) => {
          await upload(video);
          toast.success("Video saved");
        }}
      />
    </div>
  );
}
