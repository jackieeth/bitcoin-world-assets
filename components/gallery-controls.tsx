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
  Grid2X2,
  Grid3X3,
  LayoutGrid,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  AlignJustify,
} from "lucide-react";

interface GalleryControlsProps {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  sortBy: SortOption;
  onSortChange: (option: SortOption) => void;
  gridConfig: GridConfig;
  onGridConfigChange: (config: Partial<GridConfig>) => void;
}

export function GalleryControls({
  categories,
  activeCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  gridConfig,
  onGridConfigChange,
}: GalleryControlsProps) {
  return (
    <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
      {/* <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={activeCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryChange(category)}
            className="text-xs uppercase tracking-wider"
          >
            {category}
          </Button>
        ))}
      </div> */}

      <div className="flex items-center space-x-2">
        <div className="hidden sm:flex items-center space-x-1 border-r border-white/10 pr-2">
          <Button
            variant={gridConfig.columns === 3 ? "default" : "ghost"}
            size="icon"
            onClick={() => onGridConfigChange({ columns: 3 })}
            className="h-8 w-8"
          >
            <Grid2X2 className="h-4 w-4" />
            <span className="sr-only">3 Columns</span>
          </Button>
          <Button
            variant={gridConfig.columns === 5 ? "default" : "ghost"}
            size="icon"
            onClick={() => onGridConfigChange({ columns: 5 })}
            className="h-8 w-8"
          >
            <Grid3X3 className="h-4 w-4" />
            <span className="sr-only">4 Columns</span>
          </Button>
          {/* <Button
            variant={gridConfig.columns === 7 ? "default" : "ghost"}
            size="icon"
            onClick={() => onGridConfigChange({ columns: 7 })}
            className="h-8 w-8"
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="sr-only">5 Columns</span>
          </Button> */}
        </div>

        {/* <div className="hidden sm:flex items-center space-x-1 border-r border-white/10 pr-2">
          <Button
            variant={gridConfig.gap === 0 ? "default" : "ghost"}
            size="icon"
            onClick={() => onGridConfigChange({ gap: 0 })}
            className="h-8 w-8"
          >
            <AlignJustify className="h-4 w-4" />
            <span className="sr-only">No Gap</span>
          </Button>
          <Button
            variant={gridConfig.gap === 1 ? "default" : "ghost"}
            size="icon"
            onClick={() => onGridConfigChange({ gap: 1 })}
            className="h-8 w-8"
          >
            <AlignJustify className="h-4 w-4 opacity-80" />
            <span className="sr-only">Small Gap</span>
          </Button>
          <Button
            variant={gridConfig.gap === 4 ? "default" : "ghost"}
            size="icon"
            onClick={() => onGridConfigChange({ gap: 4 })}
            className="h-8 w-8"
          >
            <AlignJustify className="h-4 w-4 opacity-60" />
            <span className="sr-only">Large Gap</span>
          </Button>
        </div> */}

        <Select
          value={sortBy}
          onValueChange={(value) => onSortChange(value as SortOption)}
        >
          <SelectTrigger className="h-8 w-[130px] text-xs">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest" className="text-xs">
              <div className="flex items-center">
                <ArrowDownNarrowWide className="mr-2 h-3 w-3" />
                Newest
              </div>
            </SelectItem>
            <SelectItem value="oldest" className="text-xs">
              <div className="flex items-center">
                <ArrowUpNarrowWide className="mr-2 h-3 w-3" />
                Oldest
              </div>
            </SelectItem>
            {/* <SelectItem value="title" className="text-xs">
              <div className="flex items-center">A-Z</div>
            </SelectItem> */}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
