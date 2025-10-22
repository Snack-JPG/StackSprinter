"use client";

import { FilterOptions } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

interface FilterBarProps {
  filters: FilterOptions;
  categories: string[];
  onFilterChange: (filters: FilterOptions) => void;
}

export function FilterBar({ filters, categories, onFilterChange }: FilterBarProps) {
  const handleReset = () => {
    onFilterChange({
      minProfit: 0,
      category: null,
      sortBy: "profit",
      sortOrder: "desc",
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-card border rounded-lg">
      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium mb-2 block">Min Profit %</label>
        <Select
          value={filters.minProfit.toString()}
          onValueChange={(value) =>
            onFilterChange({ ...filters, minProfit: parseFloat(value) })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">All (0%+)</SelectItem>
            <SelectItem value="1">1%+</SelectItem>
            <SelectItem value="2">2%+</SelectItem>
            <SelectItem value="3">3%+</SelectItem>
            <SelectItem value="5">5%+</SelectItem>
            <SelectItem value="10">10%+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium mb-2 block">Category</label>
        <Select
          value={filters.category || "all"}
          onValueChange={(value) =>
            onFilterChange({ ...filters, category: value === "all" ? null : value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[200px]">
        <label className="text-sm font-medium mb-2 block">Sort By</label>
        <Select
          value={filters.sortBy}
          onValueChange={(value) =>
            onFilterChange({
              ...filters,
              sortBy: value as FilterOptions["sortBy"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="profit">Net Profit</SelectItem>
            <SelectItem value="spread">Spread</SelectItem>
            <SelectItem value="risk">Risk Score</SelectItem>
            <SelectItem value="confidence">Match Confidence</SelectItem>
            <SelectItem value="timestamp">Timestamp</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 min-w-[150px]">
        <label className="text-sm font-medium mb-2 block">Order</label>
        <Select
          value={filters.sortOrder}
          onValueChange={(value) =>
            onFilterChange({
              ...filters,
              sortOrder: value as FilterOptions["sortOrder"],
            })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Descending</SelectItem>
            <SelectItem value="asc">Ascending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-end">
        <Button variant="outline" onClick={handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
