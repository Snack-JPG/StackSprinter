"use client";

import { useState } from "react";
import { ArbitrageOpportunity } from "@/types";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskIndicator } from "@/components/RiskIndicator";
import { MarketDetails } from "@/components/MarketDetails";
import {
  formatPercentage,
  formatTimestamp,
  getProfitLevel,
  getProfitColorClass,
} from "@/lib/utils";
import { ChevronDown, ChevronUp, ExternalLink, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface OpportunityRowProps {
  opportunity: ArbitrageOpportunity;
}

export function OpportunityRow({ opportunity }: OpportunityRowProps) {
  const [expanded, setExpanded] = useState(false);
  const profitLevel = getProfitLevel(opportunity.netProfit);
  const profitColorClass = getProfitColorClass(profitLevel);

  const { kalshiMarket, polymarketMarket, matchConfidence } = opportunity.matchedPair;

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
            <div>
              <p className="font-semibold">{kalshiMarket.name}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTimestamp(opportunity.timestamp)}
              </p>
            </div>
          </div>
        </TableCell>

        <TableCell>
          <div className="text-center">
            <Badge variant="outline" className="font-mono">
              {formatPercentage(kalshiMarket.price * 100)}
            </Badge>
          </div>
        </TableCell>

        <TableCell>
          <div className="text-center">
            <Badge variant="outline" className="font-mono">
              {formatPercentage(polymarketMarket.price * 100)}
            </Badge>
          </div>
        </TableCell>

        <TableCell>
          <div className="text-center">
            <Badge variant="secondary" className="font-mono">
              {formatPercentage(opportunity.spread)}
            </Badge>
          </div>
        </TableCell>

        <TableCell>
          <div className="text-center">
            <Badge className={profitColorClass}>
              <TrendingUp className="h-3 w-3 mr-1" />
              {formatPercentage(opportunity.netProfit)}
            </Badge>
          </div>
        </TableCell>

        <TableCell>
          <div className="text-center">
            <Badge
              variant={matchConfidence >= 80 ? "success" : matchConfidence >= 60 ? "warning" : "danger"}
            >
              {formatPercentage(matchConfidence)}
            </Badge>
          </div>
        </TableCell>

        <TableCell>
          <div className="flex justify-center">
            <RiskIndicator riskScore={opportunity.riskScore} showLabel={false} />
          </div>
        </TableCell>

        <TableCell>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" asChild>
              <a
                href={kalshiMarket.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30">
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MarketDetails market={kalshiMarket} />
                <MarketDetails market={polymarketMarket} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Kalshi Fee</p>
                  <p className="text-sm font-medium">
                    {formatPercentage(opportunity.fees.kalshi)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Polymarket Fee</p>
                  <p className="text-sm font-medium">
                    {formatPercentage(opportunity.fees.polymarket)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Fees</p>
                  <p className="text-sm font-medium">
                    {formatPercentage(opportunity.fees.total)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Match Quality</p>
                  <p className="text-sm font-medium">
                    {matchConfidence >= 80
                      ? "Excellent"
                      : matchConfidence >= 60
                      ? "Good"
                      : "Fair"}
                  </p>
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
