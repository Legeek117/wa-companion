import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  text?: string;
  showLogo?: boolean;
}

export const Loading = ({ 
  className, 
  size = "md", 
  text = "Chargement...",
  showLogo = true 
}: LoadingProps) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const logoSizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16",
  };

  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 p-8", className)}>
      {showLogo && (
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
          <div className="relative">
            <img 
              src="/icon-192x192.png" 
              alt="AMDA" 
              className={cn("object-contain animate-pulse", logoSizeClasses[size])}
              onError={(e) => {
                // Fallback si l'image ne charge pas
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="text-2xl font-bold text-primary">AMDA</div>';
                }
              }}
            />
          </div>
        </div>
      )}
      
      <div className="flex flex-col items-center gap-3">
        <Loader2 className={cn("text-primary animate-spin", sizeClasses[size])} />
        {text && (
          <p className="text-sm text-muted-foreground">{text}</p>
        )}
      </div>
    </div>
  );
};

export const LoadingSpinner = ({ className, size = "md" }: { className?: string; size?: "sm" | "md" | "lg" }) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <Loader2 className={cn("text-primary animate-spin", sizeClasses[size], className)} />
  );
};

export const LoadingOverlay = ({ text, showLogo = true }: { text?: string; showLogo?: boolean }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <Loading text={text} showLogo={showLogo} />
    </div>
  );
};




