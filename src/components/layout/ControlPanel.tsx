import { useState } from "react";
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
      >
        <div className="mx-4 mt-4 bg-background/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h3 className="text-lg font-semibold">Menu Principal</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Grid of items */}
          <div className="grid grid-cols-3 gap-3 p-4">
            {panelItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                onClick={onClose}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-2xl transition-all hover:scale-105",
                  isActive(item.url)
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/50 hover:bg-muted"
                )}
              >
                <div className="relative">
                  <item.icon className="w-6 h-6" />
                  {item.premium && (
                    <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-premium text-premium-foreground text-[8px]">
                      P
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-center font-medium leading-tight">
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
