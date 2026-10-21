import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/styles/globals.css";
import { Providers } from "./providers";

import "@fontsource/ibm-plex-sans/latin-400.css";
import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-sans/latin-700.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";

export const metadata: Metadata = {
  title: "Delivery Exception Ops",
  description: "One delivery company. Exception handling, customer reports, and seller updates.",
  openGraph: { type: "website" },
  twitter: { card: "summary_large_image" },
  icons: { icon: { url: "/favicon.ico", type: "image/x-icon" } },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
