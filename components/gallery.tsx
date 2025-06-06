"use client";

import { useState, useEffect } from "react";
import { GridItem } from "@/components/grid-item";
import { GalleryControls } from "@/components/gallery-controls";

// Define the item type
export type Item = {
  id: number;
  title: string;
  description: string;
  category: string;
  traits: any[];
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

// Sort options
export type SortOption = "newest" | "oldest" | "price"; // | "title"

interface GalleryProps {
  initialFilter?: string;
  itemsData: Item[]; // Add this prop to accept external data
  btcUsdPrice?: number; // Optional prop for BTC/USD price
  showListings?: boolean; // Optional prop to control listing display
  bwaHolder?: string;
}

export function Gallery({
  itemsData,
  btcUsdPrice,
  showListings,
  bwaHolder,
}: GalleryProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("oldest");

  useEffect(() => {
    setItems(itemsData);
    setSelectedTraits([]);
  }, [itemsData]);

  // Get all unique traits from items
  const allTraits = Array.from(new Set(items.flatMap((item) => item.traits)));

  // Handle trait filter change (toggle trait selection)
  const handleTraitChange = (trait: string) => {
    setSelectedTraits((prev) => {
      const exclusiveTraits = ["1D", "2D", "3D", "4D", "5D", "6D", "7D"];

      // If the trait is already selected, deselect it.
      if (prev.includes(trait)) {
        return prev.filter((t) => t !== trait);
      }

      // If the trait is in the exclusive group, remove any other exclusive trait.
      if (exclusiveTraits.includes(trait)) {
        const filtered = prev.filter((t) => !exclusiveTraits.includes(t));
        return [...filtered, trait];
      }

      // Otherwise, add the trait normally.
      return [...prev, trait];
    });
  };

  // Handle sort change
  const handleSortChange = (option: SortOption) => {
    setSortBy(option);
  };

  // Unified effect for filtering and sorting
  useEffect(() => {
    let result = items;

    // Filter by traits
    if (selectedTraits.length > 0) {
      result = result.filter((item) =>
        selectedTraits.every((trait) => item.traits.includes(trait)),
      );
    }

    // Sort
    result = [...result];
    switch (sortBy) {
      case "newest":
        result.sort((a, b) => b.sat - a.sat);
        break;
      case "oldest":
        result.sort((a, b) => a.sat - b.sat);
        break;
      case "price":
        result.sort((a, b) => a.priceSats - b.priceSats);
        break;
    }

    setFilteredItems(result);
  }, [items, selectedTraits, sortBy]);

  // Calculate grid classes based on configuration
  const gridClasses = `grid-container grid gap-1 grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5`;

  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <div />
      ) : (
        <div>
          <div className="block items-center justify-center text-white/60 mb-4 p-6">
            {filteredItems.length > 1 ? (
              <b>{`${filteredItems.length} Bitcoin World Assets`}</b>
            ) : (
              <b>{`1 Bitcoin World Asset`}</b>
            )}{" "}
            {showListings ? (
              <small>
                {"found via BWA market viewer (soon to be member-only access)"}
              </small>
            ) : (
              " found!!"
            )}
            <div>{bwaHolder ? `${bwaHolder} (BWA OG)` : ""} </div>
          </div>

          <GalleryControls
            allTraits={allTraits}
            selectedTraits={selectedTraits}
            onTraitChange={handleTraitChange}
            sortBy={sortBy}
            onSortChange={handleSortChange}
          />
          <div className={gridClasses}>
            {filteredItems.map((item) => (
              <GridItem key={item.id} item={item} btcUsdPrice={btcUsdPrice} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
