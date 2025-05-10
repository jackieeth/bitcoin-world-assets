"use client"

import { useState, useEffect } from "react"
import { GridItem } from "@/components/grid-item"
import { GalleryControls } from "@/components/gallery-controls"
import { generateItems } from "@/lib/data"

// Define the item type
export type Item = {
  id: number
  title: string
  description: string
  category: string
  image: string
  date: string
}

// Grid configuration options
export type GridConfig = {
  columns: number
  gap: number
}

// Sort options
export type SortOption = "newest" | "oldest" | "title"

interface GalleryProps {
  initialFilter?: string
}

export function Gallery({ initialFilter = "" }: GalleryProps) {
  // State for items and filtered items
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])

  // State for filters and sorting
  const [activeCategory, setActiveCategory] = useState<string>("all")
  const [sortBy, setSortBy] = useState<SortOption>("newest")

  // State for grid configuration
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    columns: 4,
    gap: 1,
  })

  // Load items on mount and when initialFilter changes
  useEffect(() => {
    const data = generateItems(798)
    setItems(data)

    // Apply initial filter if provided
    if (initialFilter && initialFilter !== "all") {
      const filtered = data.filter(
        (item) =>
          item.category.toLowerCase().includes(initialFilter.toLowerCase()) ||
          item.title.toLowerCase().includes(initialFilter.toLowerCase()) ||
          item.description.toLowerCase().includes(initialFilter.toLowerCase()),
      )
      setFilteredItems(filtered)

      // If the filter matches a category exactly, set it as active
      const matchingCategory = data.find(
        (item) => item.category.toLowerCase() === initialFilter.toLowerCase(),
      )?.category

      if (matchingCategory) {
        setActiveCategory(matchingCategory)
      } else {
        setActiveCategory("all")
      }
    } else {
      setFilteredItems(data)
      setActiveCategory("all")
    }
  }, [initialFilter])

  // Get unique categories from items
  const categories = ["all", ...Array.from(new Set(items.map((item) => item.category)))]

  // Handle category filter change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)

    if (category === "all") {
      setFilteredItems(items)
    } else {
      setFilteredItems(items.filter((item) => item.category === category))
    }
  }

  // Handle sort change
  const handleSortChange = (option: SortOption) => {
    setSortBy(option)

    const sorted = [...filteredItems]

    switch (option) {
      case "newest":
        sorted.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        break
      case "oldest":
        sorted.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        break
      case "title":
        sorted.sort((a, b) => a.title.localeCompare(b.title))
        break
    }

    setFilteredItems(sorted)
  }

  // Handle grid configuration change
  const handleGridConfigChange = (config: Partial<GridConfig>) => {
    setGridConfig((prev) => ({ ...prev, ...config }))
  }

  // Calculate grid classes based on configuration
  const gridClasses = `grid-container grid gap-${gridConfig.gap} grid-cols-1 sm:grid-cols-2 ${
    gridConfig.columns === 3
      ? "md:grid-cols-3"
      : gridConfig.columns === 4
        ? "md:grid-cols-3 lg:grid-cols-4"
        : "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
  }`

  return (
    <div className="space-y-6">
      <GalleryControls
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        gridConfig={gridConfig}
        onGridConfigChange={handleGridConfigChange}
      />

      {filteredItems.length === 0 ? (
        <div className="flex h-40 items-center justify-center border border-white/10 text-white/60">
          No items found.
        </div>
      ) : (
        <div className={gridClasses}>
          {filteredItems.map((item) => (
            <GridItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
