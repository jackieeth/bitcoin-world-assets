import { Gallery } from "@/components/gallery"
import { SiteHeader } from "@/components/site-header"

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <SiteHeader />
      <div className="container mx-auto px-4 py-8">
        <Gallery />
      </div>
    </main>
  )
}
