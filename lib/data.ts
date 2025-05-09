import type { Item } from "@/components/gallery"

// Categories for the demo
const categories = ["architecture", "nature", "urban", "abstract", "portrait"]

// Generate a random date within the last year
function randomDate() {
  const now = new Date()
  const pastYear = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  const timestamp = pastYear.getTime() + Math.random() * (now.getTime() - pastYear.getTime())
  return new Date(timestamp).toISOString()
}

// Generate placeholder items for the demo
export function generateItems(count: number): Item[] {
  return Array.from({ length: count }).map((_, index) => {
    const id = index + 1
    const category = categories[Math.floor(Math.random() * categories.length)]

    return {
      id,
      title: `Item ${id}`,
      description: `Description for item ${id}`,
      category,
      // Use a placeholder image service with grayscale filter
      image: `/placeholder.svg?height=500&width=500&text=Item+${id}`,
      date: randomDate(),
    }
  })
}
