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
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={isNearLimit ? "text-destructive font-medium" : "font-medium"}>
          {current}/{max}
        </span>
      </div>
      <Progress value={percentage} className={isNearLimit ? "bg-destructive/20" : ""} />
    </div>
  );
};
