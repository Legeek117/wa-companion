import { Progress } from "@/components/ui/progress";

interface QuotaCounterProps {
  current: number;
  max: number;
  label: string;
}

export const QuotaCounter = ({ current, max, label }: QuotaCounterProps) => {
  const percentage = (current / max) * 100;
  const isNearLimit = percentage > 70;

  return (
    <div className="space-y-2">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2 text-xs sm:text-sm">
        <span className="text-muted-foreground truncate">{label}</span>
        <span className={`whitespace-nowrap ${isNearLimit ? "text-destructive font-medium" : "font-medium"}`}>
          {current}/{max}
        </span>
      </div>
      <Progress value={percentage} className={`h-1.5 sm:h-2 ${isNearLimit ? "bg-destructive/20" : ""}`} />
    </div>
  );
};
