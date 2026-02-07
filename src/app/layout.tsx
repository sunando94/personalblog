import Footer from "@/app/_components/footer";
import { HOME_OG_IMAGE_URL } from "@/lib/constants";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import cn from "classnames";
import { ThemeSwitcher } from "./_components/theme-switcher";
import Header from "./_components/header";
import { GlobalAssistant } from "./_components/global-assistant";
import { Analytics } from '@vercel/analytics/next';
import "highlight.js/styles/github-dark.css";

import "./globals.css";

import { SiteTracker } from "./_components/site-tracker";
import { NewsletterModal } from "./_components/newsletter-modal";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://sunandobhattacharya.vercel.app'),
  title: {
    template: "%s | Sudo Make Me Sandwich",
    default: "Sudo Make Me Sandwich",
  },
  description: "A personal blog sharing thoughts, ideas, and experiences on technology, coding, and life.",
  keywords: ["Personal Blog", "Technology", "Software Engineering", "Coding", "Web Development","AI","LLM","AGENTIC", "ANTIGRAVITY", "GEMINI","OPENAI","ANTHROPIC","HUMAN"],
  authors: [{ name: "Sunando Bhattacharya" }],
  creator: "Sunando Bhattacharya",
  openGraph: {
    title: "Sudo Make Me Sandwich",
    description: "A personal blog sharing thoughts, ideas, and experiences.",
    url: '/',
    siteName: "Sudo Make Me Sandwich",
    locale: 'en_US',
    type: 'website',
    images: [{
      url: HOME_OG_IMAGE_URL,
      width: 1200,
      height: 630,
      alt: "Sudo Make Me Sandwich Blog Cover",
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Sudo Make Me Sandwich",
    description: "A personal blog sharing thoughts, ideas, and experiences.",
    creator: "@sunando94", // Assuming handle based on previous context, can be updated later
    images: [HOME_OG_IMAGE_URL],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
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
        <Suspense fallback={null}>
          <SiteTracker />
        </Suspense>
        <Header />
        <div className="min-h-screen">{children}</div>
        <Footer />
        <GlobalAssistant />
        <NewsletterModal />
        <Analytics />
      </body>
    </html>
  );
}
