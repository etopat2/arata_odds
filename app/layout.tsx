import type { Metadata } from "next";
import "./globals.css";
import "./experience.css";

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html:"try{const t=localStorage.getItem('arata-theme')==='light'?'light':'dark';document.documentElement.dataset.theme=t;document.documentElement.classList.toggle('dark',t==='dark');document.documentElement.style.colorScheme=t;}catch{}"}}/></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}

