// layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AuthLayout from "./AuthLayout";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "DayDream Forge",
  description: "DayDream Forge — your AI-powered transformation coach.",
  keywords: [
    "AI",
    "fitness",
    "DayDream Forge",
    "health",
    "coaching",
    "AI assistant",
    "transformation",
  ],
  icons: {
    icon: "/favicon-new.png?v=2",
    apple: "/apple-touch-icon.png?v=2",
  },
  openGraph: {
    title: "DayDream Forge",
    description: "Transform your life with DayDream Forge, your AI-powered coach.",
    url: "https://www.daydreamforge.com",
    type: "website",
    images: [
      {
        url: "/og-image.png?v=2",
        width: 1200,
        height: 630,
        alt: "DayDream Forge AI Assistant",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DayDream Forge",
    description: "Transform your life with DayDream Forge, your AI-powered coach.",
    images: ["/twitter-card.png?v=2"],
    creator: "@YourTwitterHandle",
  },
  metadataBase: new URL("https://www.daydreamforge.com"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#00ffff" />
        <link rel="icon" href="/favicon-new.png?v=2" type="image/png" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png?v=2"
        />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}
