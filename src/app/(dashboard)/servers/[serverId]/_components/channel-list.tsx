"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { HashIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { canManageChannels, Role } from "../../../../../../convex/lib/permissions";

function CreateChannel({ server }: { server: Id<"servers"> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const create = useMutation(api.functions.channel.create);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = await create({ server, name });
      setOpen(false);
      setName("");
      router.push(`/servers/${server}/channels/${id}`);
    } catch (error) {
      toast.error("Could not create channel", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-6">
          <PlusIcon className="size-4" />
          <span className="sr-only">Create channel</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create channel</DialogTitle>
          <DialogDescription>Channel names are lowercase, like #dev-chat.</DialogDescription>
        </DialogHeader>
        <form className="contents" onSubmit={submit}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="new-channel" autoFocus />
          <DialogFooter>
            <Button disabled={name.trim().length === 0}>Create</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ChannelList({ server, role }: { server: Id<"servers">; role: Role }) {
  const channels = useQuery(api.functions.channel.list, { server });
  const removeChannel = useMutation(api.functions.channel.remove);
  const { channelId } = useParams<{ channelId?: string }>();
  const router = useRouter();
  const canManage = canManageChannels(role);

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="flex items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Text channels</span>
        {canManage && <CreateChannel server={server} />}
      </div>
      <ul>
        {channels?.map((channel) => (
          <li key={channel._id} className="group flex items-center">
            <Link
              href={`/servers/${server}/channels/${channel._id}`}
              className={cn(
                "flex flex-1 items-center gap-2 truncate rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                channel._id === channelId && "bg-primary/10 text-primary"
              )}
            >
              <HashIcon className="size-4 shrink-0" />
              <span className="truncate">{channel.name}</span>
            </Link>
            {canManage && channels.length > 1 && (
              <button
                type="button"
                className="px-1 text-muted-foreground opacity-0 hover:text-destructive focus:opacity-100 group-hover:opacity-100"
                onClick={() => {
                  if (!window.confirm(`Delete #${channel.name} and its messages?`)) return;
                  removeChannel({ id: channel._id })
                    .then(() => {
                      if (channel._id === channelId) router.push(`/servers/${server}`);
                    })
                    .catch((error) =>
                      toast.error("Could not delete channel", {
                        description: error instanceof Error ? error.message : undefined,
                      })
                    );
                }}
              >
                <Trash2Icon className="size-4" />
                <span className="sr-only">Delete #{channel.name}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
