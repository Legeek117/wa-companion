import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

interface PlanBadgeProps {
  isPremium?: boolean;
  className?: string;
}

export const PlanBadge = ({ isPremium = false, className }: PlanBadgeProps) => {
  return (
    <Badge 
      variant={isPremium ? "default" : "outline"} 
      className={`text-xs sm:text-sm py-1 ${isPremium ? "bg-premium text-premium-foreground" : ""} ${className || ""}`}
    >
      {isPremium && <Crown className="w-3 h-3 mr-1 flex-shrink-0" />}
      <span className="whitespace-nowrap">{isPremium ? "Premium" : "Gratuit"}</span>
    </Badge>
  );
};
