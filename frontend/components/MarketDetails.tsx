import { Market } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar, TrendingUp } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";

interface MarketDetailsProps {
  market: Market;
}

export function MarketDetails({ market }: MarketDetailsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{market.name}</CardTitle>
            <Badge variant="secondary" className="mt-2">
              {market.platform === "kalshi" ? "Kalshi" : "Polymarket"}
            </Badge>
          </div>
          <a
            href={market.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-1"
          >
            <span className="text-sm">View Market</span>
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="text-2xl font-bold">{formatPercentage(market.price * 100)}</p>
          </div>
          {market.volume && (
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Volume
              </p>
              <p className="text-lg font-semibold">{formatCurrency(market.volume)}</p>
            </div>
          )}
        </div>

        {market.endDate && (
          <div>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              End Date
            </p>
            <p className="text-sm font-medium">
              {new Date(market.endDate).toLocaleDateString()}
            </p>
          </div>
        )}

        {market.resolutionCriteria && (
          <div>
            <p className="text-sm text-muted-foreground font-medium mb-1">
              Resolution Criteria
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              {market.resolutionCriteria}
            </p>
          </div>
        )}

        {market.category && (
          <div>
            <p className="text-sm text-muted-foreground">Category</p>
            <Badge variant="outline" className="mt-1">
              {market.category}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
