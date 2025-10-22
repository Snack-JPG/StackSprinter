import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ArbitrageOpportunity, RiskLevel, ProfitLevel, OpportunityWithMeta } from "@/types";

// Tailwind CSS class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format percentage
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// Format currency
export function formatCurrency(value: number, decimals: number = 2): string {
  return `$${value.toFixed(decimals)}`;
}

// Format timestamp
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// Get risk level from risk score (1-10)
export function getRiskLevel(riskScore: number): RiskLevel {
  if (riskScore <= 3) return "low";
  if (riskScore <= 6) return "medium";
  return "high";
}

// Get profit level from net profit percentage
export function getProfitLevel(netProfit: number): ProfitLevel {
  if (netProfit >= 5) return "high";
  if (netProfit >= 3) return "medium";
  return "low";
}

// Get color class for profit level
export function getProfitColorClass(profitLevel: ProfitLevel): string {
  const colors = {
    high: "text-profit-high bg-profit-high/10 border-profit-high/20",
    medium: "text-profit-medium bg-profit-medium/10 border-profit-medium/20",
    low: "text-profit-low bg-profit-low/10 border-profit-low/20",
  };
  return colors[profitLevel];
}

// Get color class for risk level
export function getRiskColorClass(riskLevel: RiskLevel): string {
  const colors = {
    low: "text-risk-low bg-risk-low/10 border-risk-low/20",
    medium: "text-risk-medium bg-risk-medium/10 border-risk-medium/20",
    high: "text-risk-high bg-risk-high/10 border-risk-high/20",
  };
  return colors[riskLevel];
}

// Check if opportunity is expiring soon (within 1 hour)
export function isExpiringSoon(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours <= 1 && diffHours > 0;
}

// Enhance opportunity with metadata
export function enhanceOpportunity(opportunity: ArbitrageOpportunity): OpportunityWithMeta {
  return {
    ...opportunity,
    riskLevel: getRiskLevel(opportunity.riskScore),
    profitLevel: getProfitLevel(opportunity.netProfit),
    isExpiringSoon: isExpiringSoon(opportunity.expiresAt),
  };
}

// Sort opportunities
export function sortOpportunities(
  opportunities: ArbitrageOpportunity[],
  sortBy: 'spread' | 'profit' | 'risk' | 'confidence' | 'timestamp',
  order: 'asc' | 'desc' = 'desc'
): ArbitrageOpportunity[] {
  const sorted = [...opportunities].sort((a, b) => {
    let aVal: number, bVal: number;

    switch (sortBy) {
      case 'spread':
        aVal = a.spread;
        bVal = b.spread;
        break;
      case 'profit':
        aVal = a.netProfit;
        bVal = b.netProfit;
        break;
      case 'risk':
        aVal = a.riskScore;
        bVal = b.riskScore;
        break;
      case 'confidence':
        aVal = a.matchedPair.matchConfidence;
        bVal = b.matchedPair.matchConfidence;
        break;
      case 'timestamp':
        aVal = new Date(a.timestamp).getTime();
        bVal = new Date(b.timestamp).getTime();
        break;
      default:
        return 0;
    }

    return order === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return sorted;
}

// Filter opportunities
export function filterOpportunities(
  opportunities: ArbitrageOpportunity[],
  minProfit?: number,
  category?: string | null,
  maxRisk?: number,
  minConfidence?: number
): ArbitrageOpportunity[] {
  return opportunities.filter((opp) => {
    if (minProfit !== undefined && opp.netProfit < minProfit) return false;
    if (category && opp.category !== category) return false;
    if (maxRisk !== undefined && opp.riskScore > maxRisk) return false;
    if (minConfidence !== undefined && opp.matchedPair.matchConfidence < minConfidence) return false;
    return true;
  });
}

// Get unique categories from opportunities
export function getUniqueCategories(opportunities: ArbitrageOpportunity[]): string[] {
  const categories = opportunities
    .map((opp) => opp.category)
    .filter((cat): cat is string => !!cat);
  return Array.from(new Set(categories)).sort();
}

// Calculate dashboard stats
export function calculateDashboardStats(opportunities: ArbitrageOpportunity[]): {
  totalOpportunities: number;
  bestSpread: number;
  averageProfit: number;
  highRiskCount: number;
} {
  if (opportunities.length === 0) {
    return {
      totalOpportunities: 0,
      bestSpread: 0,
      averageProfit: 0,
      highRiskCount: 0,
    };
  }

  const bestSpread = Math.max(...opportunities.map((opp) => opp.spread));
  const totalProfit = opportunities.reduce((sum, opp) => sum + opp.netProfit, 0);
  const averageProfit = totalProfit / opportunities.length;
  const highRiskCount = opportunities.filter((opp) => opp.riskScore > 6).length;

  return {
    totalOpportunities: opportunities.length,
    bestSpread,
    averageProfit,
    highRiskCount,
  };
}
