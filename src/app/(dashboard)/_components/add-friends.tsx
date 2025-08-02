import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "../../../../convex/_generated/api";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { useState } from "react";
import { UserPlus } from "lucide-react";

export function AddFriend() {
  const [open, setOpen] = useState(false);
  const createFriendRequest = useMutation(api.functions.friend.friendRequest);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const username = e.currentTarget.username.value;
      await createFriendRequest({ username });
      toast.success("Friend request sent");
      setOpen(false);
    } catch (error) {
      toast.error("Failed to send friend request", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-primary/25 transition-all duration-200"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Add Friend
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Friend</DialogTitle>
          <DialogDescription>
            You can add a friend by entering their username.
          </DialogDescription>
        </DialogHeader>
        <form className="contents" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1">
            <Label htmlFor="username">Username</Label>
            <Input id="username" type="text" />
          </div>
          <DialogFooter>
            <Button>Send Friend Request</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
