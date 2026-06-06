"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

/** Shown when the server doesn't exist or the user is not a member (the Convex query throws). */
export default function ServerError() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-xl font-bold">You can&apos;t open this server</h1>
      <p className="text-muted-foreground">
        It may have been deleted, or you haven&apos;t joined it yet. Ask for an invite code.
      </p>
      <Button asChild>
        <Link href="/">Back to friends</Link>
      </Button>
    </div>
  );
}
