"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "../../../../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Button } from "@/components/ui/button";
import { MessageCircleIcon, XIcon, CheckIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function PendingFriendsList() {
  const friends = useQuery(api.functions.friend.listPending);
  const updateStatus = useMutation(api.functions.friend.updateStatus);

  return (
    <div className="flex flex-col divide-y divide-border/30">
      <h2 className="text-xs font-medium text-muted-foreground p-2.5">
        Pending Friends
      </h2>
      {friends?.length === 0 && (
        <FriendsListEmpty>No pending friend requests yet</FriendsListEmpty>
      )}
      {friends?.map((friend, index) => (
        <FriendItem
          key={index}
          username={friend.user.username}
          image={friend.user.image}
          status="pending"
        >
          <IconButton
            title="Accept"
            icon={<CheckIcon />}
            className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border-green-500/30"
            onClick={() => {
              updateStatus({ id: friend._id, status: "accepted" });
            }}
          />
          <IconButton
            title="Reject"
            icon={<XIcon />}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
            onClick={() => {
              updateStatus({ id: friend._id, status: "rejected" });
            }}
          />
        </FriendItem>
      ))}
    </div>
  );
}

export function AcceptedFriendsList() {
  const friends = useQuery(api.functions.friend.listAccepted);
  const updateStatus = useMutation(api.functions.friend.updateStatus);

  return (
    <div className="flex flex-col divide-y divide-border/30">
      <h2 className="text-xs font-medium text-muted-foreground p-2.5">
        Accepted Friends
      </h2>
      {friends?.length === 0 && (
        <FriendsListEmpty>No Accepted friends yet</FriendsListEmpty>
      )}
      {friends?.map((friend, index) => (
        <FriendItem
          key={index}
          username={friend.user.username}
          image={friend.user.image}
          status="online"
        >
          <IconButton
            title="Start DM"
            icon={<MessageCircleIcon />}
            className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border-blue-500/30"
            onClick={() => {}}
          />
          <IconButton
            title="Remove Friend"
            icon={<XIcon />}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-500/30"
            onClick={() => {
              updateStatus({ id: friend._id, status: "rejected" });
            }}
          />
        </FriendItem>
      ))}
    </div>
  );
}

function FriendsListEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 bg-muted/30 text-center text-sm text-muted-foreground rounded-lg border border-border/30">
      {children}
    </div>
  );
}

function IconButton({
  title,
  className,
  icon,
  onClick,
}: {
  title: string;
  className?: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          className={cn(
            "rounded-full transition-all duration-200 hover:scale-105",
            className
          )}
          variant="outline"
          size="icon"
          onClick={onClick}
        >
          {icon}
          <span className="sr-only">{title}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

const FriendItem = ({
  username,
  image,
  children,
  status = "offline",
}: {
  username: string;
  image: string;
  children?: React.ReactNode;
  status?: "online" | "offline" | "pending";
}) => {
  const statusColors = {
    online: "bg-green-400 shadow-green-400/50",
    offline: "bg-gray-400 shadow-gray-400/50",
    pending: "bg-yellow-400 shadow-yellow-400/50",
  };

  return (
    <div className="group card-hover flex items-center justify-between gap-3 p-3 rounded-lg bg-card/50 border border-border/30">
      <div className="flex items-center gap-3">
        <div className="relative">
          <Avatar className="size-10 border-2 border-border/50">
            <AvatarImage src={image} className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-foreground font-semibold">
              {username[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card shadow-sm",
              statusColors[status]
            )}
          />
        </div>
        <div>
          <p className="font-medium text-foreground">{username}</p>
          <p className="text-xs text-muted-foreground capitalize">{status}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {children}
      </div>
    </div>
  );
};
