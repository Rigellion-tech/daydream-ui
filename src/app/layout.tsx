import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthLayout from "./AuthLayout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    icon: "/favicon-new.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "DayDream Forge",
    description: "Transform your life with DayDream Forge, your AI-powered coach.",
    url: "https://daydreamforge.com",
    type: "website",
    images: [
      {
        url: "/og-image.png",
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
    images: ["/twitter-card.png"],
    creator: "@YourTwitterHandle",
  },
  metadataBase: new URL("https://daydreamforge.com"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="index, follow" />
        <meta name="theme-color" content="#00ffff" />
        <link rel="icon" href="/favicon-new.png" type="image/png" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthLayout>{children}</AuthLayout>
      </body>
    </html>
  );
}
