import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { ClerkProvider } from "@clerk/clerk-react";
import type { ReactNode } from "react";

import appCss from "~/styles/app.css?url";

const CLERK_PUBLISHABLE_KEY = "pk_live_Y2xlcmsucm9zdGVyLXdvcmsuY29tJA";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Roster — Premium Hospitality Staffing Network" },
      { name: "description", content: "Denver-Boulder's membership-based staffing network for vetted bartenders, servers, and hospitality venues. Flat monthly fee, zero commission per booking." },
      { property: "og:title", content: "Roster — Staff on Demand. No Markups. No Contracts." },
      { property: "og:description", content: "The membership-based staffing network for bartenders, servers, and hospitality venues. Denver-Boulder." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://roster-work.com" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" }
    ],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <html lang="en">
        <head>
          <HeadContent />
        </head>
        <body>
          {children}
          <Scripts />
        </body>
      </html>
    </ClerkProvider>
  );
}
