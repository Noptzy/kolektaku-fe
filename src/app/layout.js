import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import FloatingChat from "@/components/FloatingChat";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: {
    template: "%s | Kolektaku",
    default: "Kolektaku — Platform Streaming Anime & Manga Collection"
  },
  description: "Nonton streaming anime kesayanganmu dengan subtitle Indonesia, kualitas HD, dan fitur collection tracker hanya di Kolektaku.",
  keywords: ["anime", "streaming anime", "nonton anime", "subtitle indonesia", "manga", "kolektaku", "nonton anime sub indo"],
  authors: [{ name: "Kolektaku" }],
  creator: "Kolektaku",
  openGraph: {
    title: "Kolektaku — Platform Streaming Anime & Manga",
    description: "Nonton streaming anime kesayanganmu dengan subtitle Indonesia, kualitas HD, dan koleksi lengkap.",
    url: "https://kolektaku.com", // Adjust to domain
    siteName: "Kolektaku",
    images: [
      {
        url: "/logo.png", // Can be replaced with a real og-image.jpg
        width: 800,
        height: 600,
        alt: "Kolektaku Logo",
      }
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kolektaku — Streaming Anime",
    description: "Nonton anime subtitle Indonesia di Kolektaku.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/icon.png?v=2",
    shortcut: "/favicon.ico?v=2",
    apple: "/logo.png?v=2",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" data-theme="dark" suppressHydrationWarning>
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <FloatingChat />
            <Analytics />
            <SpeedInsights />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
