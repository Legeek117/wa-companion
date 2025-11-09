import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatsCard = ({ title, value, icon: Icon, description, trend }: StatsCardProps) => {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm font-medium truncate flex-1 min-w-0 pr-2">{title}</CardTitle>
        <Icon className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
      </CardHeader>
      <CardContent className="pb-4 sm:pb-6">
        <div className="text-xl sm:text-2xl font-bold mb-1">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 truncate">{description}</p>
        )}
        {trend && (
          <p className={`text-xs mt-1 ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
            {trend.isPositive ? "+" : ""}{trend.value}% ce mois
          </p>
        )}
      </CardContent>
    </Card>
  );
};
