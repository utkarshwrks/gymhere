import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { isConfigured } from "@/lib/env";

/**
 * Auth gate. Role-specific access (super_admin vs gym vs member) is enforced in
 * the route-group layouts where DB role is available; middleware only ensures a
 * session exists for protected areas. When Clerk isn't configured (demo without
 * keys) middleware is a pass-through so the marketing site still renders.
 */
const isProtected = createRouteMatcher([
  "/sa(.*)",
  "/app(.*)",
  "/me(.*)",
  "/onboarding(.*)",
]);

const handler = clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect();
  }
});

export default isConfigured.clerk ? handler : () => NextResponse.next();

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else + API.
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)",
  ],
};
