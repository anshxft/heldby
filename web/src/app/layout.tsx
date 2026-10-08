import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter_Tight } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Pet } from "@/components/pet";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "TrustPay — USDC Escrow on Arc", template: "%s · TrustPay" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: { type: "website", siteName: SITE_NAME, url: "/" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${interTight.variable} ${plexMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* hide animated elements before first paint so they don't flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if(!matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.classList.add("motion")`,
          }}
        />
      </head>
      <body>
        {children}
        {/* Pip reads the URL to know which page it is on; Suspense keeps dynamic routes prerenderable */}
        <Suspense fallback={null}>
          <Pet />
        </Suspense>
      </body>
    </html>
  );
}
