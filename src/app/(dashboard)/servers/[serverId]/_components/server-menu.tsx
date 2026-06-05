"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMutation } from "convex/react";
import { ChevronDownIcon, CopyIcon, LogOutIcon, PencilIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "../../../../../../convex/_generated/api";
import { Id } from "../../../../../../convex/_generated/dataModel";
import { canDeleteServer, canManageServer, Role } from "../../../../../../convex/lib/permissions";

export function ServerMenu({
  id,
  name,
  role,
  inviteCode,
}: {
  id: Id<"servers">;
  name: string;
  role: Role;
  inviteCode?: string;
}) {
  const router = useRouter();
  const rename = useMutation(api.functions.server.rename);
  const regenerate = useMutation(api.functions.server.regenerateInvite);
  const leave = useMutation(api.functions.server.leave);
  const remove = useMutation(api.functions.server.remove);

  const run = async (action: () => Promise<unknown>, failure: string, success?: string) => {
    try {
      await action();
      if (success) toast.success(success);
    } catch (error) {
      toast.error(failure, { description: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center justify-between border-b border-border/50 px-4 py-3 text-left font-bold hover:bg-muted/40">
        <span className="truncate">{name}</span>
        <ChevronDownIcon className="size-4 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-card border border-border/50">
        {inviteCode && (
          <DropdownMenuItem
            className="flex items-center gap-2"
            onClick={() =>
              navigator.clipboard
                .writeText(inviteCode)
                .then(() => toast.success(`Invite code ${inviteCode} copied`))
                .catch(() => toast.error("Could not copy the invite code"))
            }
          >
            <CopyIcon className="size-4" />
            Copy invite code ({inviteCode})
          </DropdownMenuItem>
        )}
        {canManageServer(role) && (
          <>
            <DropdownMenuItem
              className="flex items-center gap-2"
              onClick={() => run(() => regenerate({ id }), "Could not create a new code", "New invite code created")}
            >
              <RefreshCwIcon className="size-4" />
              New invite code
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2"
              onClick={() => {
                const next = window.prompt("New server name", name);
                if (next && next.trim() !== name) {
                  void run(() => rename({ id, name: next }), "Could not rename the server");
                }
              }}
            >
              <PencilIcon className="size-4" />
              Rename server
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        {role !== "owner" && (
          <DropdownMenuItem
            className="flex items-center gap-2 text-destructive"
            onClick={() => {
              if (window.confirm(`Leave ${name}?`)) {
                void run(async () => {
                  await leave({ id });
                  router.push("/");
                }, "Could not leave the server");
              }
            }}
          >
            <LogOutIcon className="size-4" />
            Leave server
          </DropdownMenuItem>
        )}
        {canDeleteServer(role) && (
          <DropdownMenuItem
            className="flex items-center gap-2 text-destructive"
            onClick={() => {
              if (window.confirm(`Delete ${name} and all of its messages? This cannot be undone.`)) {
                void run(async () => {
                  await remove({ id });
                  router.push("/");
                }, "Could not delete the server");
              }
            }}
          >
            <Trash2Icon className="size-4" />
            Delete server
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
