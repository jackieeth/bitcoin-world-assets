"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export function SiteHeader() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/90 backdrop-blur">
      <div className="container flex h-16 items-center px-4">
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold tracking-wider">BITCOIN WORLD ASSETS</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end">
          <nav className="space-x-6 md:flex">
            {/* <Link href="/" className="text-sm font-medium transition-colors hover:text-white/80">
              HOME
            </Link>
            <Link href="#" className="text-sm font-medium transition-colors hover:text-white/80">
              ABOUT
            </Link> */}
            <Link href="#" className="text-sm font-medium transition-colors hover:text-white/80">
              WALLET
            </Link>
          </nav>
          {/* <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-black border-white/10">
              <nav className="flex flex-col space-y-6 mt-6">
                <Link
                  href="/"
                  className="text-sm font-medium transition-colors hover:text-white/80"
                  onClick={() => setIsOpen(false)}
                >
                  HOME
                </Link>
                <Link
                  href="#"
                  className="text-sm font-medium transition-colors hover:text-white/80"
                  onClick={() => setIsOpen(false)}
                >
                  ABOUT
                </Link>
                <Link
                  href="#"
                  className="text-sm font-medium transition-colors hover:text-white/80"
                  onClick={() => setIsOpen(false)}
                >
                  CONTACT
                </Link>
              </nav>
            </SheetContent>
          </Sheet> */}
        </div>
      </div>
    </header>
  )
}
