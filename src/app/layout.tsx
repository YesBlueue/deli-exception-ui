import type { Metadata } from "next";
import { Theme } from "@radix-ui/themes";
import type { ReactNode } from "react";

import "@/styles/globals.css";
import { STAFF_THEME } from "@/shared/theme";
import { Providers } from "./providers";

import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-sans/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";

export const metadata: Metadata = {
  title: { default: "ResolveMate", template: "%s · ResolveMate" },
  applicationName: "ResolveMate",
  description:
    "ResolveMate: delivery exception handling, customer reports, and seller updates for one delivery company.",
  openGraph: { type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      {/* The theme sits on <body> so content portalled to the body (dialogs, selects, toasts) stays themed. */}
      <Theme asChild {...STAFF_THEME}>
        <body>
          <Providers>{children}</Providers>
        </body>
      </Theme>
    </html>
  );
}
