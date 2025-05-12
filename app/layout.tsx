import type React from "react"
import type { Metadata } from "next"
import { Space_Mono } from "next/font/google"
import { VideoBackground } from "@/components/video-background"
import "./globals.css"

// Using Space Mono as it's similar to a terminal font and widely available
const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
})

export const metadata: Metadata = {
  title: "BITCOIN WORLD ASSETS",
  description: "Build Digital Worlds on Bitcoin Blocks",
  openGraph: {
    title: "BITCOIN WORLD ASSETS",
    description: "Build Digital Worlds on Bitcoin Blocks",
    url: "https://bitcoinworldassets.com", // update with your domain
    images: [
      {
        url: "https://bitcoinworldassets.com/preview.jpg", // add the preview image URL
        width: 1200,
        height: 630,
      },
    ],
    siteName: "Bitcoin World Assets",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BITCOIN WORLD ASSETS",
    description: "Build Digital Worlds on Bitcoin Blocks",
    images: ["https://bitcoinworldassets.com/preview.jpg"],
  },
  generator: "qAI",
  icons: {
    icon: "/favicon-16x16.png", // path relative to the public folder
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${spaceMono.variable} font-mono`}>
        <VideoBackground />
        {children}
      </body>
    </html>
  )
}
