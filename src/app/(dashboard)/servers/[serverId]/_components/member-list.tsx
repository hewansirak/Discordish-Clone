"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PresenceDot } from "@/components/presence-dot";
import { useOnlineUsers } from "@/hooks/use-presence";
import { useMutation, useQuery } from "convex/react";
import { CrownIcon, MoreVerticalIcon, ShieldIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { canChangeRoles, canKick, Role } from "../../../../../../convex/lib/permissions";

export function MemberList({
  server,
  myRole,
  myId,
}: {
  server: Id<"servers">;
  myRole: Role;
  myId: Id<"users">;
}) {
  const members = useQuery(api.functions.server.members, { id: server });
  const setRole = useMutation(api.functions.server.setRole);
  const kick = useMutation(api.functions.server.kick);
  const online = useOnlineUsers(members?.map((m) => m.user._id) ?? []);

  const report = (message: string) => (error: unknown) =>
    toast.error(message, { description: error instanceof Error ? error.message : undefined });

  return (
    <aside className="hidden w-60 shrink-0 flex-col overflow-y-auto border-l border-border/50 bg-sidebar-background p-2 lg:flex">
      <h2 className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Members — {members?.length ?? 0}
      </h2>
      <ul>
        {members?.map(({ user, role }) => {
          const isSelf = user._id === myId;
          const showMenu = !isSelf && (canChangeRoles(myRole) || canKick(myRole, role)) && role !== "owner";
          return (
            <li key={user._id} className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/40">
              <div className="relative">
                <Avatar className="size-8">
                  <AvatarImage src={user.image} />
                  <AvatarFallback>{user.username[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <PresenceDot online={isSelf || online.has(user._id)} className="border-sidebar-background" />
              </div>
              <span className="flex-1 truncate text-sm">{user.username}</span>
              {role === "owner" && <CrownIcon className="size-4 text-yellow-400" aria-label="Owner" />}
              {role === "admin" && <ShieldIcon className="size-4 text-blue-400" aria-label="Admin" />}
              {showMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="opacity-0 focus:opacity-100 group-hover:opacity-100">
                    <MoreVerticalIcon className="size-4 text-muted-foreground" />
                    <span className="sr-only">Member actions for {user.username}</span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-card border border-border/50">
                    {canChangeRoles(myRole) && (
                      <DropdownMenuItem
                        onClick={() =>
                          setRole({ id: server, user: user._id, role: role === "admin" ? "member" : "admin" }).catch(
                            report("Could not change role")
                          )
                        }
                      >
                        {role === "admin" ? "Remove admin" : "Make admin"}
                      </DropdownMenuItem>
                    )}
                    {canKick(myRole, role) && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          if (window.confirm(`Remove ${user.username} from the server?`)) {
                            kick({ id: server, user: user._id }).catch(report("Could not remove member"));
                          }
                        }}
                      >
                        Remove from server
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
