import type { Metadata, Viewport } from "next";
import { Archivo_Black } from "next/font/google";
import localFont from "next/font/local";
import { preload } from "react-dom";
import { Analytics } from "@vercel/analytics/next";
import { EPHEMERIS_URL } from "@/lib/ephemeris";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site";
import "./globals.css";

const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// DejaVu Sans Mono, subset to Latin + the handful of symbols the page uses.
const mono = localFont({
  src: "./fonts/DejaVuSansMono-subset.woff2",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    siteName: SITE_TITLE,
    title: "Voyager 1: one light-day from Earth",
    description: SITE_DESCRIPTION,
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    creator: "@kevdotpng",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f2f2f0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Start downloading the trajectory data alongside the HTML.
  preload(EPHEMERIS_URL, { as: "fetch", crossOrigin: "anonymous" });

  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
