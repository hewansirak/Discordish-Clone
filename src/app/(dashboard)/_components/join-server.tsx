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
import { Label } from "@/components/ui/label";
import { useMutation } from "convex/react";
import { LogInIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../../../convex/_generated/api";

export function JoinServer() {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const joinServer = useMutation(api.functions.server.join);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = await joinServer({ inviteCode: code });
      setOpen(false);
      setCode("");
      router.push(`/servers/${id}`);
    } catch (error) {
      toast.error("Could not join server", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="size-11 rounded-2xl border-dashed text-blue-400 hover:rounded-xl"
        >
          <LogInIcon className="size-5" />
          <span className="sr-only">Join a server</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join a server</DialogTitle>
          <DialogDescription>Paste the invite code someone shared with you.</DialogDescription>
        </DialogHeader>
        <form className="contents" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <Label htmlFor="invite-code">Invite code</Label>
            <Input
              id="invite-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="ABCD2345"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button disabled={code.trim().length === 0}>Join</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
