"use client";

import { SidebarProvider } from "@/components/ui/sidebar";
import { RedirectToSignIn } from "@clerk/nextjs";
import { Authenticated, Unauthenticated } from "convex/react";
import { DashboardSidebar } from "./_components/sidebar";
import { ServerRail } from "./_components/server-rail";
import { usePresenceHeartbeat } from "@/hooks/use-presence";

function PresenceHeartbeat() {
  usePresenceHeartbeat();
  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Authenticated>
        <PresenceHeartbeat />
        <div className="flex min-h-svh w-full">
          <ServerRail />
          <SidebarProvider className="min-w-0 flex-1">
            <DashboardSidebar />
            {children}
          </SidebarProvider>
        </div>
      </Authenticated>
      <Unauthenticated>
        <RedirectToSignIn />
      </Unauthenticated>
    </>
  );
}
