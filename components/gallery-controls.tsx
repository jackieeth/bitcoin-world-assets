"use client";

import type { GridConfig, SortOption } from "@/components/gallery";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Gem,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
} from "lucide-react";

interface GalleryControlsProps {
  allTraits: string[];
  selectedTraits: string[];
  onTraitChange: (trait: string) => void;
  sortBy: SortOption;
  onSortChange: (option: SortOption) => void;
}

export function GalleryControls({
  allTraits,
  selectedTraits,
  onTraitChange,
  sortBy,
  onSortChange,
}: GalleryControlsProps) {
  return (
    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-4">
      <div className="flex flex-wrap gap-2">
        {allTraits.map((trait) => {
          if (trait !== "UNCOMMON") {
            return (
              <Button
                key={trait}
                variant={selectedTraits.includes(trait) ? "default" : "outline"}
                size="sm"
                onClick={() => onTraitChange(trait)}
                className="text-xs uppercase tracking-wider"
              >
                {trait}
              </Button>
            );
          }
          return null;
        })}
      </div>

      <div className="flex items-center space-x-2">
        <Select
          value={sortBy}
          onValueChange={(value) => onSortChange(value as SortOption)}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="oldest" className="text-xs bg-black">
              <div className="flex items-center">
                <ArrowUpNarrowWide className="mr-2 h-3 w-3" />
                Oldest
              </div>
            </SelectItem>
            <SelectItem value="newest" className="text-xs bg-black">
              <div className="flex items-center">
                <ArrowDownWideNarrow className="mr-2 h-3 w-3" />
                Latest
              </div>
            </SelectItem>

            <SelectItem value="price" className="text-xs bg-black">
              <div className="flex items-center">
                <Gem className="mr-2 h-3 w-3" />
                Price
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
