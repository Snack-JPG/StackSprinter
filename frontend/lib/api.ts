import { ArbitrageOpportunity, DashboardStats, Market, ApiResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Get all arbitrage opportunities
  async getOpportunities(): Promise<ApiResponse<ArbitrageOpportunity[]>> {
    return this.fetch<ArbitrageOpportunity[]>("/api/opportunities");
  }

  // Get a specific opportunity by ID
  async getOpportunity(id: string): Promise<ApiResponse<ArbitrageOpportunity>> {
    return this.fetch<ArbitrageOpportunity>(`/api/opportunities/${id}`);
  }

  // Get dashboard stats
  async getStats(): Promise<ApiResponse<DashboardStats>> {
    return this.fetch<DashboardStats>("/api/stats");
  }

  // Get market details
  async getMarketDetails(platform: 'kalshi' | 'polymarket', marketId: string): Promise<ApiResponse<Market>> {
    return this.fetch<Market>(`/api/markets/${platform}/${marketId}`);
  }

  // Get Kalshi markets
  async getKalshiMarkets(): Promise<ApiResponse<Market[]>> {
    return this.fetch<Market[]>("/api/markets/kalshi");
  }

  // Get Polymarket markets
  async getPolymarketMarkets(): Promise<ApiResponse<Market[]>> {
    return this.fetch<Market[]>("/api/markets/polymarket");
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return this.fetch<{ status: string; timestamp: string }>("/api/health");
  }
}

// Export singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export class for testing
export default ApiClient;
