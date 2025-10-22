"use client";

import { ArbitrageOpportunity } from "@/types";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OpportunityRow } from "./OpportunityRow";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

interface OpportunityTableProps {
  opportunities: ArbitrageOpportunity[];
  loading?: boolean;
}

export function OpportunityTable({ opportunities, loading = false }: OpportunityTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Opportunities Found</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          There are currently no arbitrage opportunities matching your filters.
          Try adjusting your filter criteria or check back later.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Market Name</TableHead>
            <TableHead className="text-center">Kalshi Price</TableHead>
            <TableHead className="text-center">Polymarket Price</TableHead>
            <TableHead className="text-center">Spread %</TableHead>
            <TableHead className="text-center">Net Profit %</TableHead>
            <TableHead className="text-center">Match Confidence</TableHead>
            <TableHead className="text-center">Risk Score</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.map((opportunity) => (
            <OpportunityRow key={opportunity.id} opportunity={opportunity} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
