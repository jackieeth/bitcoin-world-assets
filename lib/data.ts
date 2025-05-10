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
    const id = index
    const category = categories[Math.floor(Math.random() * categories.length)]

    return {
      id,
      title: `${id}.518357.bitmap`,
      description: `Nakamoto Matrix Parcel ${id}`,
      category,
      // Use a placeholder image service with grayscale filter
      image: `https://img-cdn.magiceden.dev/da:t/rs:fit:400:0:0/plain/https%3A%2F%2Frunescape.id%2Fparcel518357c%2F518357p${id}.png`,
      date: id,
    }
  })
}
