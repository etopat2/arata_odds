import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arata Odds — Football research",
  description: "Your personal football probabilities, value picks and ticket tracker.",
  manifest: "/manifest.webmanifest",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/brand/icon-192.png",
    apple: "/brand/icon-180.png",
    shortcut: "/brand/arata-mark.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">{children}</body>
    </html>
  );
}

