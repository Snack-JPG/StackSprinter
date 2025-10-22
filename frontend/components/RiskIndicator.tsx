import { Badge } from "@/components/ui/badge";
import { getRiskLevel, getRiskColorClass } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";

interface RiskIndicatorProps {
  riskScore: number;
  showLabel?: boolean;
}

export function RiskIndicator({ riskScore, showLabel = true }: RiskIndicatorProps) {
  const riskLevel = getRiskLevel(riskScore);
  const colorClass = getRiskColorClass(riskLevel);

  const getIcon = () => {
    switch (riskLevel) {
      case "low":
        return <CheckCircle className="h-3 w-3" />;
      case "medium":
        return <AlertCircle className="h-3 w-3" />;
      case "high":
        return <AlertTriangle className="h-3 w-3" />;
    }
  };

  const getLabel = () => {
    switch (riskLevel) {
      case "low":
        return "Low Risk";
      case "medium":
        return "Medium Risk";
      case "high":
        return "High Risk";
    }
  };

  const getDescription = () => {
    switch (riskLevel) {
      case "low":
        return "Low risk opportunity with high market matching confidence";
      case "medium":
        return "Moderate risk - verify market conditions before executing";
      case "high":
        return "High risk - significant uncertainty or market mismatch";
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={colorClass}>
            {getIcon()}
            {showLabel && <span className="ml-1">{getLabel()}</span>}
            <span className="ml-1 text-xs opacity-70">({riskScore}/10)</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{getDescription()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
