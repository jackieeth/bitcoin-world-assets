"use client"

import { useEffect, useRef } from "react"

export function VideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    // Ensure video plays automatically when loaded
    if (videoRef.current) {
      videoRef.current.play().catch((error) => {
        console.error("Video autoplay failed:", error)
      })
    }
  }, [])

  return (
    <div className="fixed inset-0 -z-10 h-full w-full overflow-hidden">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        // poster="/placeholder.svg?height=1080&width=1920"
      >
        <source src="/vid_bg.mp4" type="video/mp4" />
      </video>
      {/* Overlay to ensure content is visible and maintain the black and white aesthetic */}
      <div className="absolute inset-0 bg-black/80" />
    </div>
  )
}
