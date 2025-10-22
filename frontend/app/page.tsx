"use client";

import { useState, useMemo } from "react";
import { useArbitrageOpportunities } from "@/hooks/useArbitrageOpportunities";
import { FilterOptions } from "@/types";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { OpportunityTable } from "@/components/dashboard/OpportunityTable";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, TrendingUp, Wifi, WifiOff } from "lucide-react";
import { calculateDashboardStats, getUniqueCategories } from "@/lib/utils";

export default function Dashboard() {
  const {
    opportunities,
    loading,
    error,
    connected,
    autoRefresh,
    setAutoRefresh,
    refetch,
    getFilteredOpportunities,
  } = useArbitrageOpportunities();

  const [filters, setFilters] = useState<FilterOptions>({
    minProfit: 0,
    category: null,
    sortBy: "profit",
    sortOrder: "desc",
  });

  // Get filtered opportunities
  const filteredOpportunities = useMemo(
    () => getFilteredOpportunities(filters),
    [getFilteredOpportunities, filters]
  );

  // Calculate stats from all opportunities
  const stats = useMemo(
    () => calculateDashboardStats(opportunities),
    [opportunities]
  );

  // Get unique categories
  const categories = useMemo(
    () => getUniqueCategories(opportunities),
    [opportunities]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">ArbitrageMarkets</h1>
            <Badge variant={connected ? "success" : "danger"} className="ml-2">
              {connected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Live
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Disconnected
                </>
              )}
            </Badge>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Auto-refresh</span>
              <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refetch}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Error State */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive font-medium">Error: {error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <StatsCards
          totalOpportunities={stats.totalOpportunities}
          bestSpread={stats.bestSpread}
          averageProfit={stats.averageProfit}
          highRiskCount={stats.highRiskCount}
        />

        <Separator />

        {/* Filters */}
        <FilterBar
          filters={filters}
          categories={categories}
          onFilterChange={setFilters}
        />

        {/* Opportunities Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Arbitrage Opportunities</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Showing {filteredOpportunities.length} of {opportunities.length}{" "}
                opportunities
              </p>
            </div>
          </div>

          <OpportunityTable
            opportunities={filteredOpportunities}
            loading={loading}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-6">
          <p className="text-sm text-muted-foreground text-center">
            ArbitrageMarkets - Real-time arbitrage detection between Kalshi and
            Polymarket
          </p>
        </div>
      </footer>
    </div>
  );
}
