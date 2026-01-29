import Footer from "@/app/_components/footer";
import { HOME_OG_IMAGE_URL } from "@/lib/constants";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import cn from "classnames";
import { ThemeSwitcher } from "./_components/theme-switcher";
import { Analytics } from '@vercel/analytics/next';
import "highlight.js/styles/github-dark.css";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: "Sudo Make Me Sandwich",
  description: "A personal blog sharing thoughts, ideas, and experiences.",
  openGraph: {
    images: [HOME_OG_IMAGE_URL],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="apple-touch-icon"
          href="/favicon.svg?v=2"
        />
        <link
          rel="icon"
          type="image/svg+xml"
          href="/favicon.svg?v=2"
        />
        <link rel="shortcut icon" href="/favicon.ico?v=2" />
        <meta name="theme-color" content="#000" />
        <link rel="alternate" type="application/rss+xml" href="/feed.xml" />
      </head>
      <body
        className={cn(inter.className, "dark:bg-slate-900 dark:text-slate-400")}
      >
        <ThemeSwitcher />
        <div className="min-h-screen">{children}</div>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
