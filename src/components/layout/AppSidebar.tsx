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
  Bot,
  BarChart3,
  Settings,
  Sparkles,
  MessageCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const menuItems = [
  {
    title: "Accueil",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Gestion Status",
    url: "/dashboard/status",
    icon: Heart,
  },
  {
    title: "View Once",
    url: "/dashboard/viewonce",
    icon: Eye,
    badge: "2/3",
  },
  {
    title: "Messages Supprimés",
    url: "/dashboard/deleted",
    icon: Trash2,
    badge: "1/3",
  },
  {
    title: "Répondeur Auto",
    url: "/dashboard/autoresponder",
    icon: Bot,
  },
  {
    title: "Analytics",
    url: "/dashboard/analytics",
    icon: BarChart3,
    premium: true,
  },
  {
    title: "Paramètres",
    url: "/dashboard/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  const collapsed = state === "collapsed";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        {/* Logo */}
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

        {/* Menu Items */}
        <SidebarGroup className="mt-4">
          {!collapsed && (
            <SidebarGroupLabel className="text-xs text-muted-foreground px-4 mb-2">
              MENU PRINCIPAL
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 px-4 py-2 rounded-lg transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1">{item.title}</span>
                          {item.premium && (
                            <Badge className="bg-gradient-premium text-premium-foreground text-xs">
                              Pro
                            </Badge>
                          )}
                          {item.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Upgrade Banner */}
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

        {/* Toggle Button */}
        <div className="p-2 border-t border-sidebar-border">
          <SidebarTrigger className="w-full" />
        </div>
      </SidebarContent>
    </Sidebar>
  );
}