import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Store Update Monitor",
  description:
    "Track store update execution across Manitoba, Edmonton, and Calgary. Sign in to monitor CFC Refresh, AOO Manual Import, Menu Pull, and Deliverect MenuPull progress.",
  keywords: [
    "Store Update Monitor",
    "Store Monitoring",
    "Update Tracking",
    "KFC",
    "KT",
    "CFC Refresh",
    "AOO Manual Import",
    "Menu Pull",
    "Deliverect",
    "Retail Operations",
  ],
  authors: [{ name: "Raymond M. Reintegrado" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Store Update Monitor",
    description:
      "Track store update execution across Manitoba, Edmonton, and Calgary in real-time.",
    siteName: "Store Update Monitor",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Store Update Monitor",
    description:
      "Track store update execution across Manitoba, Edmonton, and Calgary in real-time.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
