"use client";

import { useQuery } from "convex/react";
import { use } from "react";
import { api } from "../../../../../convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

export default async function MessagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // TODO
}
