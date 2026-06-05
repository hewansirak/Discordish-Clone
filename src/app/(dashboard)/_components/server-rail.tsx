"use client";

import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { MessageSquareIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { CreateServer } from "./create-server";
import { JoinServer } from "./join-server";

function initials(name: string) {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Narrow column on the far left: home plus one button per server. */
export function ServerRail() {
  const servers = useQuery(api.functions.server.list);
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <nav
        aria-label="Servers"
        className="flex w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-border/50 bg-sidebar-background py-3"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/"
              className={cn(
                "flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary transition-all hover:rounded-xl",
                !pathname.startsWith("/servers") && "rounded-xl bg-primary text-primary-foreground"
              )}
            >
              <MessageSquareIcon className="size-5" />
              <span className="sr-only">Friends and direct messages</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">Friends & DMs</TooltipContent>
        </Tooltip>
        <Separator className="w-8" />

        {servers?.map((server) => {
          const active = pathname.startsWith(`/servers/${server._id}`);
          return (
            <Tooltip key={server._id}>
              <TooltipTrigger asChild>
                <Link
                  href={`/servers/${server._id}`}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-2xl bg-card text-sm font-semibold transition-all hover:rounded-xl hover:bg-primary/30",
                    active && "rounded-xl bg-primary text-primary-foreground"
                  )}
                >
                  {initials(server.name)}
                  <span className="sr-only">{server.name}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{server.name}</TooltipContent>
            </Tooltip>
          );
        })}

        <CreateServer />
        <JoinServer />
      </nav>
    </TooltipProvider>
  );
}
