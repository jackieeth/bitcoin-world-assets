"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

interface LandingPageProps {
  onSearch: (query: string) => void
}

export function LandingPage({ onSearch }: LandingPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus the input field when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      onSearch(searchQuery)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion)
    // Use a small timeout to ensure the state updates before submitting
    setTimeout(() => onSearch(suggestion), 10)
  }

  return (
    <div className="landing-page flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="max-w-3xl space-y-8 transition-all duration-500">
        <h1 className="text-2xl font-bold tracking-tighter sm:text-5xl md:text-2xl lg:text-3xl">BITCOIN WORLD ASSETS</h1>
        <p className="mx-auto max-w-[700px] text-m text-white/70 md:text-l">
          DIGITAL ASSETS on BTC BLOCKS<br/>
          Bitcoin blocks were never empty—they were canvases waiting for eyes. By elevating ordinals, inscriptions, and rare sats from collectibles to building blocks, we transform historical data into perpetual terrain, art, and story.
        </p>

        <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-lg items-center space-x-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter a BTC wallet...bc1p"
              className="h-12 w-full rounded-md border border-white/10 bg-black/40 px-4 pl-10 pr-4 text-white backdrop-blur-sm"
            />
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white/50" />
          </div>
          <Button type="submit" disabled={!searchQuery.trim()} className="h-12 px-6">
            Explore
          </Button>
        </form>

        <div className="flex flex-wrap justify-center gap-2 text-sm text-white/50">
          <span>Try:</span>
          {["architecture", "nature", "urban", "abstract", "portrait"].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="hover:text-white focus:text-white focus:outline-none"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
