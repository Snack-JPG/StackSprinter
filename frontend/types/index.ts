// Market types
export interface Market {
  id: string;
  name: string;
  platform: 'kalshi' | 'polymarket';
  price: number;
  volume?: number;
  liquidity?: number;
  url: string;
  resolutionCriteria?: string;
  endDate?: string;
  category?: string;
}

// Matched pair of markets
export interface MatchedPair {
  kalshiMarket: Market;
  polymarketMarket: Market;
  matchConfidence: number; // 0-100
  similarityScore: number;
}

// Arbitrage opportunity
export interface ArbitrageOpportunity {
  id: string;
  matchedPair: MatchedPair;
  spread: number; // Percentage difference
  netProfit: number; // Expected profit percentage after fees
  riskScore: number; // 1-10, higher is riskier
  timestamp: string;
  category?: string;
  expiresAt?: string;
  fees: {
    kalshi: number;
    polymarket: number;
    total: number;
  };
  volume?: {
    kalshi: number;
    polymarket: number;
  };
}

// Dashboard stats
export interface DashboardStats {
  totalOpportunities: number;
  bestSpread: number;
  count24h: number;
  averageProfit: number;
  highRiskCount: number;
}

// Filter options
export interface FilterOptions {
  minProfit: number;
  category: string | null;
  sortBy: 'spread' | 'profit' | 'risk' | 'confidence' | 'timestamp';
  sortOrder: 'asc' | 'desc';
  maxRisk?: number;
  minConfidence?: number;
}

// Socket events
export interface SocketEvents {
  opportunities: (data: ArbitrageOpportunity[]) => void;
  newOpportunity: (data: ArbitrageOpportunity) => void;
  opportunityExpired: (id: string) => void;
  stats: (data: DashboardStats) => void;
  connection: () => void;
  disconnect: () => void;
  error: (error: Error) => void;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Risk level
export type RiskLevel = 'low' | 'medium' | 'high';

// Profit level
export type ProfitLevel = 'low' | 'medium' | 'high';

// Helper function types
export interface OpportunityWithMeta extends ArbitrageOpportunity {
  riskLevel: RiskLevel;
  profitLevel: ProfitLevel;
  isExpiringSoon: boolean;
}
