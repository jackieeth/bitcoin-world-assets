"use client";

import { useState, useEffect } from "react";
import { GridItem } from "@/components/grid-item";
import { GalleryControls } from "@/components/gallery-controls";
import { generateItems } from "@/lib/data";
import { set } from "react-hook-form";

// Define the item type
export type Item = {
  id: number;
  title: string;
  description: string;
  category: string;
  image: string;
  date: string;
  sat: number;
  block: number;
  priceSats: number;
  showListings: boolean;
  blockTime?: string; // Optional field for block time
  listingUri?: string; // Optional field for listing URI
  listedOn?: string; // Optional field for listing marketplace
  // ntx: number;
};

// Grid configuration options
export type GridConfig = {
  columns: number;
  gap: number;
};

// Sort options
export type SortOption = "newest" | "oldest"; // | "title"

interface GalleryProps {
  initialFilter?: string;
  itemsData: Item[]; // Add this prop to accept external data
  btcUsdPrice?: number; // Optional prop for BTC/USD price
  showListings?: boolean; // Optional prop to control listing display
}

export function Gallery({ initialFilter = "", itemsData, btcUsdPrice, showListings }: GalleryProps) {
  // State for items and filtered items
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  

  // State for filters and sorting
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // State for grid configuration
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    columns: 6,
    gap: 2,
  });

  // Load items from props on mount
  useEffect(() => {
    setItems(itemsData);
    setFilteredItems(itemsData); // display all items without filtering
    setActiveCategory("all");
  }, [itemsData]);

  // Get unique categories from items
  // const categories = ["all", ...Array.from(new Set(items.map((item) => item.category)))]
  const categories = ["all", "rare-sats", "uncommon-sats", "common-sats"];

  // Handle category filter change
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);

    if (category === "all") {
      setFilteredItems(items);
    } else {
      setFilteredItems(items.filter((item) => item.category === category));
    }
  };

  // Handle sort change
  const handleSortChange = (option: SortOption) => {
    setSortBy(option);

    const sorted = [...filteredItems];

    switch (option) {
      case "newest":
        sorted.sort((a, b) => b.sat - a.sat);
        break;
      case "oldest":
        sorted.sort((a, b) => a.sat - b.sat);
        break;
      // case "title":
      //   sorted.sort((a, b) => a.title.localeCompare(b.title))
      //   break
    }

    setFilteredItems(sorted);
  };

  // Handle grid configuration change
  const handleGridConfigChange = (config: Partial<GridConfig>) => {
    setGridConfig((prev) => ({ ...prev, ...config }));
  };

  // Calculate grid classes based on configuration
  const gridClasses = `grid-container grid gap-${gridConfig.gap} grid-cols-2 sm:grid-cols-2 ${
    gridConfig.columns === 3
      ? "md:grid-cols-3"
      : gridConfig.columns === 4
        ? "md:grid-cols-3 lg:grid-cols-4"
        : "md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
  }`;

  return (
    <div className="space-y-6">
      {/* <GalleryControls
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={handleCategoryChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        gridConfig={gridConfig}
        onGridConfigChange={handleGridConfigChange}
      /> */}

      {items.length === 0 ? (
        <div/>
      ) : (
        <div>
        <div className="flex items-center justify-center border border-white/10 text-white/60 mb-4">
          {items.length > 1 ? `${items.length} Bitcoin World Assets` : `1 Bitcoin World Asset`} {showListings ? 'found at marketplaces':' found'}
        </div>
        <div className={gridClasses}>
          
          {items.map((item) => (
            <GridItem key={item.id} item={item} btcUsdPrice={btcUsdPrice}/>
          ))}
        </div></div>
      )}
    </div>
  );
}
