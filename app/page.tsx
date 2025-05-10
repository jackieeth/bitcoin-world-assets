"use client"

import { useState } from "react"
import { Gallery } from "@/components/gallery"
import { SiteHeader } from "@/components/site-header"
import { LandingPage } from "@/components/landing-page"

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("")
  const [showGrid, setShowGrid] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Handle search submission
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setIsTransitioning(true)

    // Start transition animation
    setTimeout(() => {
      setShowGrid(true)
      // Allow time for the fade in animation
      setTimeout(() => {
        setIsTransitioning(false)
      }, 300)
    }, 500) // Longer delay before showing grid to ensure fade out completes
  }

  // Handle back to search button
  const handleBackToSearch = () => {
    setIsTransitioning(true)

    // Start transition animation
    setTimeout(() => {
      setShowGrid(false)
      // Allow time for the fade in animation
      setTimeout(() => {
        setIsTransitioning(false)
      }, 300)
    }, 500)
  }

  return (
    <main className="min-h-screen text-white">
      {/* Only show header when grid is visible */}
      {showGrid && (
        <div className={`transition-opacity duration-500 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
          <SiteHeader onBackToSearch={handleBackToSearch} showBackButton={true} />
        </div>
      )}

      <div className={`transition-opacity duration-500 ${isTransitioning ? "opacity-0" : "opacity-100"}`}>
        {!showGrid ? (
          <LandingPage onSearch={handleSearch} />
        ) : (
          <div className="container mx-auto px-4 py-8">
            <div className="mb-6 flex items-center">
              <h2 className="text-2xl font-bold">Results for "{searchQuery}"</h2>
            </div>
            <Gallery initialFilter={searchQuery} />
          </div>
        )}
      </div>
    </main>
  )
}
