"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth } from "@clerk/nextjs";

const client = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!); // Found in .env.local

/**
 * Narrow Clerk's useAuth to the shape ConvexProviderWithClerk expects.
 * Newer Clerk versions return a wider union that the Convex adapter's type rejects.
 */
function useClerkAuth() {
  const auth = useAuth();
  return {
    isLoaded: auth.isLoaded,
    isSignedIn: auth.isSignedIn,
    getToken: (options: { template?: "convex"; skipCache?: boolean }) =>
      auth.getToken(options),
    orgId: auth.orgId,
    orgRole: auth.orgRole,
    sessionId: auth.sessionId,
    sessionClaims: ("sessionClaims" in auth ? auth.sessionClaims : undefined) as
      | Record<string, unknown>
      | null
      | undefined,
  };
}

export function ConvexClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexProviderWithClerk client={client} useAuth={useClerkAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
