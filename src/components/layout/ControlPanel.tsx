import { useState, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  List,
  Calendar,
  Sliders,
  MessageSquare,
  BarChart3,
  Crown,
  HelpCircle,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const panelItems = [
  { title: "Liste Status", url: "/dashboard/status/list", icon: List },
  { title: "Programmer Status", url: "/dashboard/status/schedule", icon: Calendar },
  { title: "Config Status", url: "/dashboard/status/config", icon: Sliders },
  { title: "Répondeur Auto", url: "/dashboard/autoresponder", icon: MessageSquare },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3, premium: true },
  { title: "Upgrade Premium", url: "/dashboard/upgrade", icon: Crown },
  { title: "Aide & Support", url: "/dashboard/help", icon: HelpCircle },
];

interface ControlPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ControlPanel({ isOpen, onClose }: ControlPanelProps) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;
    
    if (isUpSwipe && isOpen) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Control Panel */}
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out md:hidden",
          isOpen ? "translate-y-0" : "-translate-y-full"
        )}
        style={{
          animation: isOpen ? "slideDown 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="mx-4 mt-4 bg-background/80 backdrop-blur-3xl rounded-[2rem] shadow-glass border border-border/30 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-md">
                <MessageSquare className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="text-lg font-bold tracking-tight">Menu Principal</h3>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center hover:bg-muted/50 rounded-2xl transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Swipe indicator */}
          <div className="flex justify-center pt-2">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
          </div>

          {/* Grid of items - iOS style */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 pb-5 sm:pb-6">
            {panelItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                onClick={onClose}
                className={cn(
                  "flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl sm:rounded-3xl transition-all duration-300 active:scale-95",
                  isActive(item.url)
                    ? "bg-primary/15 text-primary shadow-sm"
                    : "bg-muted/30 hover:bg-muted/50 text-foreground"
                )}
              >
                <div className={cn(
                  "relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all duration-300",
                  isActive(item.url)
                    ? "bg-primary/20 shadow-md"
                    : "bg-background/50"
                )}>
                  <item.icon className={cn(
                    "transition-all duration-300",
                    isActive(item.url) ? "w-6 h-6 sm:w-7 sm:h-7" : "w-5 h-5 sm:w-6 sm:h-6"
                  )} />
                  {item.premium && (
                    <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-gradient-premium flex items-center justify-center shadow-premium">
                      <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-premium-foreground" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] sm:text-xs text-center font-semibold leading-tight px-1">
                  {item.title}
                </span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          60% {
            transform: translateY(10px);
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
