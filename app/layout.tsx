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
    generator: 'qAI',
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
