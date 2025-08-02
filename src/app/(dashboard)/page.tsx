"use client";

import { Button } from "@/components/ui/button";
import {
  PendingFriendsList,
  AcceptedFriendsList,
} from "./_components/friends-list";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AddFriend } from "./_components/add-friends";
import { Users } from "lucide-react";

export default function FriendsPage() {
  return (
    <div className="flex-1 flex-col flex h-full bg-gradient-to-br from-background via-background to-muted/20">
      <header className="glass-effect border-b border-border/50 backdrop-blur-sm">
        <div className="flex justify-between items-center p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Friends
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your connections
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AddFriend />
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-6 space-y-6">
          <TooltipProvider delayDuration={0}>
            <div className="space-y-6">
              <PendingFriendsList />
              <AcceptedFriendsList />
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
