"use client";

import { useEffect, useState, useCallback } from "react";
import { ArbitrageOpportunity, FilterOptions } from "@/types";
import { socketClient } from "@/lib/socket";
import { apiClient } from "@/lib/api";
import { filterOpportunities, sortOpportunities } from "@/lib/utils";

export function useArbitrageOpportunities() {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch initial opportunities
  const fetchOpportunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getOpportunities();

      if (response.success && response.data) {
        setOpportunities(response.data);
      } else {
        setError(response.error || "Failed to fetch opportunities");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    if (!autoRefresh) return;

    const socket = socketClient.connect();

    // Handle connection status
    socket.on("connect", () => {
      setConnected(true);
      console.log("WebSocket connected");
    });

    socket.on("disconnect", () => {
      setConnected(false);
      console.log("WebSocket disconnected");
    });

    // Handle opportunities updates
    socketClient.onOpportunities((data) => {
      setOpportunities(data);
      setLoading(false);
    });

    // Handle new opportunity
    socketClient.onNewOpportunity((opportunity) => {
      setOpportunities((prev) => [opportunity, ...prev]);
    });

    // Handle opportunity expiration
    socketClient.onOpportunityExpired((id) => {
      setOpportunities((prev) => prev.filter((opp) => opp.id !== id));
    });

    // Fetch initial data
    fetchOpportunities();

    return () => {
      socketClient.disconnect();
    };
  }, [autoRefresh, fetchOpportunities]);

  // Apply filters and sorting
  const getFilteredOpportunities = useCallback(
    (filters: FilterOptions): ArbitrageOpportunity[] => {
      let filtered = filterOpportunities(
        opportunities,
        filters.minProfit,
        filters.category,
        filters.maxRisk,
        filters.minConfidence
      );

      filtered = sortOpportunities(filtered, filters.sortBy, filters.sortOrder);

      return filtered;
    },
    [opportunities]
  );

  return {
    opportunities,
    loading,
    error,
    connected,
    autoRefresh,
    setAutoRefresh,
    refetch: fetchOpportunities,
    getFilteredOpportunities,
  };
}
