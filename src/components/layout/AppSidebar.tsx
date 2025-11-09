import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Home,
  Heart,
  Eye,
  Trash2,
  Settings,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Desktop menu items (all items)
const desktopMenuItems = [
  { title: "Accueil", url: "/dashboard", icon: Home },
  { title: "Gestion Status", url: "/dashboard/status", icon: Heart },
  { title: "View Once", url: "/dashboard/view-once", icon: Eye },
  { title: "Messages Supprimés", url: "/dashboard/deleted-messages", icon: Trash2 },
  { title: "Paramètres", url: "/dashboard/settings", icon: Settings },
];

// Bottom navigation items for mobile
const bottomNavItems = [
  { title: "Gestion Status", url: "/dashboard/status", icon: Heart },
  { title: "View Once", url: "/dashboard/view-once", icon: Eye },
  { title: "Accueil", url: "/dashboard", icon: Home },
  { title: "Messages Supprimés", url: "/dashboard/deleted-messages", icon: Trash2 },
  { title: "Paramètres", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  const collapsed = state === "collapsed";

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar className={cn(collapsed ? "w-14" : "w-64", "hidden md:flex")} collapsible="icon">
        <SidebarContent>
          <div className="px-4 py-6 border-b border-sidebar-border">
            {collapsed ? (
              <div className="flex justify-center">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <MessageCircle className="w-8 h-8 text-primary" />
                <span className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
                  WA Bot Pro
                </span>
              </div>
            )}
          </div>

          <SidebarGroup className="mt-4">
            {!collapsed && (
              <SidebarGroupLabel className="text-xs text-muted-foreground px-4 mb-2">
                MENU PRINCIPAL
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {desktopMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end
                        className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors hover:bg-sidebar-accent"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="flex-1">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {!collapsed && (
            <div className="mt-auto p-4 mb-4">
              <div className="bg-gradient-premium rounded-lg p-4 text-premium-foreground">
                <Sparkles className="w-6 h-6 mb-2" />
                <h4 className="font-semibold mb-1 text-sm">Passez à Premium</h4>
                <p className="text-xs opacity-90 mb-3">
                  Débloquez toutes les fonctionnalités
                </p>
                <button className="w-full bg-background text-foreground px-3 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
                  Upgrade
                </button>
              </div>
            </div>
          )}

          <div className="p-2 border-t border-sidebar-border">
            <SidebarTrigger className="w-full" />
          </div>
        </SidebarContent>
      </Sidebar>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-background border-t border-border">
        <div className="flex items-center justify-around h-16 px-2">
          {bottomNavItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all",
                isActive(item.url)
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.title.split(" ")[0]}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </>
  );
}
