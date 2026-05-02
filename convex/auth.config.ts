// Set CLERK_JWT_ISSUER_DOMAIN in the Convex dashboard to your Clerk issuer,
// for example https://your-app.clerk.accounts.dev
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN,
      applicationID: "convex",
    },
  ],
};
