import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";

interface PlanBadgeProps {
  plan?: 'free' | 'premium';
  isPremium?: boolean; // For backward compatibility
  className?: string;
}

export const PlanBadge = ({ plan, isPremium, className }: PlanBadgeProps) => {
  const premium = plan === 'premium' || isPremium === true;
  
  return (
    <Badge 
      variant={premium ? "default" : "outline"} 
      className={`text-xs sm:text-sm py-1 ${premium ? "bg-premium text-premium-foreground" : ""} ${className || ""}`}
    >
      {premium && <Crown className="w-3 h-3 mr-1 flex-shrink-0" />}
      <span className="whitespace-nowrap">{premium ? "Premium" : "Gratuit"}</span>
    </Badge>
  );
};
