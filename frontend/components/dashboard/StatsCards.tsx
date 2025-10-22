import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Percent, Activity, AlertTriangle } from "lucide-react";
import { formatPercentage } from "@/lib/utils";

interface StatsCardsProps {
  totalOpportunities: number;
  bestSpread: number;
  averageProfit: number;
  highRiskCount: number;
}

export function StatsCards({
  totalOpportunities,
  bestSpread,
  averageProfit,
  highRiskCount,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Total Opportunities",
      value: totalOpportunities,
      icon: Activity,
      description: "Active arbitrage opportunities",
      color: "text-blue-500",
    },
    {
      title: "Best Spread",
      value: formatPercentage(bestSpread),
      icon: TrendingUp,
      description: "Highest spread percentage",
      color: "text-profit-high",
    },
    {
      title: "Average Profit",
      value: formatPercentage(averageProfit),
      icon: Percent,
      description: "Mean net profit across all",
      color: "text-profit-medium",
    },
    {
      title: "High Risk Count",
      value: highRiskCount,
      icon: AlertTriangle,
      description: "Opportunities with risk > 6",
      color: "text-risk-high",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
