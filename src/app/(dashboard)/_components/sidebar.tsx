"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlusIcon, User2Icon, MessageCircle, Settings, LogOut, Hash } from "lucide-react";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "convex/react";
import { SignOutButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { NewDirectMessage } from "./new-direct-message";
import { cn } from "@/lib/utils";

export function DashboardSidebar() {
  const user = useQuery(api.functions.user.get);
  const directMessages = useQuery(api.functions.dm.list);
  const pathname = usePathname();

  if (!user) return null;
  return (
    <Sidebar className="border-r border-border/50 bg-sidebar-background">
      <SidebarContent className="bg-gradient-to-b from-sidebar-background to-sidebar-background/95">
        {/* Server Header */}
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Hash className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">Discordish</span>
          </div>
        </div>

        <SidebarGroup className="px-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  asChild 
                  isActive={pathname === "/"}
                  className={cn(
                    "discord-hover rounded-lg mb-1 h-10",
                    pathname === "/" && "bg-primary/10 text-primary border-r-2 border-primary"
                  )}
                >
                  <Link href="/" className="flex items-center gap-3">
                    <User2Icon className="w-5 h-5" />
                    <span className="font-medium">Friends</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
          
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel className="flex items-center justify-between px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Direct Messages</span>
              <NewDirectMessage />
            </SidebarGroupLabel>
            <SidebarMenu>
              <SidebarGroupContent className="space-y-1">
                {directMessages?.map((directMessage) => (
                  <SidebarMenuItem key={directMessage._id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === `/dms/${directMessage._id}`}
                      className={cn(
                        "discord-hover rounded-lg h-10",
                        pathname === `/dms/${directMessage._id}` && "bg-primary/10 text-primary border-r-2 border-primary"
                      )}
                    >
                      <Link href={`/dms/${directMessage._id}`} className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="size-6 border border-border/50">
                            <AvatarImage src={directMessage.user.image} />
                            <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-accent/20">
                              {directMessage.user.username[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-sidebar-background" />
                        </div>
                        <span className="font-medium truncate">
                          {directMessage.user.username}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarGroupContent>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t border-border/30 bg-sidebar-background/95">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton className="discord-hover flex items-center gap-3 h-12 rounded-lg bg-card/30 border border-border/30">
                      <div className="relative">
                        <Avatar className="size-8 border border-border/50">
                          <AvatarImage src={user.image} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 font-semibold">
                            {user.username[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-sidebar-background" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium text-foreground truncate">{user.username}</p>
                        <p className="text-xs text-muted-foreground">Online</p>
                      </div>
                      <Settings className="w-4 h-4 text-muted-foreground" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-card border border-border/50">
                    <DropdownMenuItem className="flex items-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <LogOut className="w-4 h-4" />
                      <SignOutButton>Sign Out</SignOutButton>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
