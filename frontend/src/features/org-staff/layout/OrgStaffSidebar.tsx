import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Moon, Sun, Wallet, Settings } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/app/providers";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn, getMediaUrl } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/useAuthStore";
import { useWalletStore } from "@/store/useWalletStore";
import { formatRupees } from "@/types/wallet";
import { RoleBadge } from "@/components/common/RoleBadge";
import { ORG_STAFF_NAV } from "./sidebarConfig";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { NavItem } from "@/components/layout/sidebarConfig";
import { getWalletRoute } from "@/lib/routeUtils";

export function OrgStaffSidebar() {
  const { user, logout } = useAuthStore();
  const { balance } = useWalletStore();
  const { resolvedTheme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const hasWalletPermission = !!user?.module_permissions?.can_view_wallet_history;

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const displayName = user ? [user.first_name, user.last_name].filter(Boolean).join(" ") : "";

  const isActive = (to: string) => {
    const currentPath = location.pathname;
    const currentSearch = location.search;

    if (to.includes("?")) {
      const [path, search] = to.split("?");
      return currentPath === path && currentSearch === `?${search}`;
    }

    if (currentPath === to && currentSearch) return false;
    if (to === "/org-staff/dashboard") return currentPath === "/org-staff/dashboard";
    return currentPath === to || currentPath.startsWith(to + "/");
  };

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully");
    navigate("/login");
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedItems(newExpanded);
  };

  const renderNavItem = (item: NavItem) => {
    const itemId = item.to;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(itemId);

    if (hasChildren) {
      return (
        <div key={itemId}>
          <SidebarMenuItem>
            <button
              onClick={() => toggleExpanded(itemId)}
              className={cn(
                "h-10 w-full rounded-xl font-semibold text-sm transition-all duration-150 flex items-center justify-between px-3",
                "text-muted-foreground hover:text-foreground hover:bg-primary/5"
              )}
            >
              <div className="flex items-center gap-2">
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")}
              />
            </button>
          </SidebarMenuItem>

          {isExpanded && (
            <div className="ml-4 mt-1 space-y-1 border-l border-border/30 pl-2">
              {item.children!.map((child) => (
                <SidebarMenuItem key={child.to}>
                  <SidebarMenuButton
                    asChild
                    tooltip={child.label}
                    isActive={isActive(child.to)}
                    onClick={handleNavClick}
                    className={cn(
                      "h-9 rounded-lg text-xs transition-all duration-150",
                      isActive(child.to)
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                    )}
                  >
                    <Link to={child.to}>
                      <child.icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{child.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <SidebarMenuItem key={itemId}>
        <SidebarMenuButton
          asChild
          tooltip={item.label}
          isActive={isActive(item.to)}
          onClick={handleNavClick}
          className={cn(
            "h-10 rounded-xl font-semibold text-sm transition-all duration-150",
            isActive(item.to)
              ? "bg-primary/15 text-primary"
              : "hover:bg-primary/5 text-muted-foreground hover:text-foreground"
          )}
        >
          <Link to={item.to}>
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const logoLink = "/org-staff/dashboard";

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="h-[72px] border-b border-border/40 flex flex-col justify-center group-data-[collapsible=icon]:px-2 px-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 w-full group-data-[collapsible=icon]:justify-center">
          <Link
            to={logoLink}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity justify-start shrink-0"
          >
            <img src="/psyichub-logo-v2.png" alt="Psyichub" className="h-14 w-auto object-contain shrink-0 group-data-[collapsible=icon]:hidden dark:filter-none" style={{ filter: "brightness(0) saturate(100%) invert(33%) sepia(43%) saturate(935%) hue-rotate(70deg) brightness(100%) contrast(83%)" }} />
            <img src="/apple-touch-icon.png" alt="Psyichub" className="h-8 w-8 object-contain shrink-0 hidden group-data-[collapsible=icon]:block mx-auto dark:filter-none" style={{ filter: "brightness(0) saturate(100%) invert(33%) sepia(43%) saturate(935%) hue-rotate(70deg) brightness(100%) contrast(83%)" }} />
          </Link>
          {user && (
            <div className="group-data-[collapsible=icon]:hidden flex shrink-0 mt-5">
              <RoleBadge role={user.role} showIcon={true} className="py-1 px-2.5 text-xs shadow-sm rounded-md" />
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3 gap-1">
        {user && (
          <div className="hidden group-data-[collapsible=icon]:flex justify-center pb-2 mb-1">
            <RoleBadge role={user.role} iconOnly={true} className="p-2 shadow-sm rounded-md" />
          </div>
        )}
        {ORG_STAFF_NAV.map((group, idx) => {
          const visibleItems = group.items.filter(item => {
            if (!item.permissionKey) return true;
            const perms = user?.module_permissions;
            if (!perms) return false;

            if (item.permissionKey === "candidates") {
              return !!perms.candidates || !!perms.patients;
            }

            return !!perms[item.permissionKey];
          });
          if (visibleItems.length === 0) return null;
          return (
            <div key={idx}>
              <SidebarGroup>
                {group.label && (
                  <SidebarGroupLabel className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 px-2 mb-1">
                    {group.label}
                  </SidebarGroupLabel>
                )}
                <SidebarGroupContent>
                  <SidebarMenu>
                    {visibleItems.map((item) => renderNavItem(item))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
              {idx < ORG_STAFF_NAV.length - 1 && group.label && (
                <SidebarSeparator className="my-1 bg-border/30" />
              )}
            </div>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/30 p-2">
        <SidebarMenu>
          <div className="flex gap-2 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:gap-1 mb-2">
            {hasWalletPermission && (
              <SidebarMenuItem className="flex-1 min-w-0">
                <SidebarMenuButton
                  asChild
                  tooltip="Wallet Balance"
                  onClick={handleNavClick}
                  className={cn(
                    "h-10 transition-all duration-150 justify-center group-data-[collapsible=icon]:justify-start",
                    "text-primary hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <Link to={getWalletRoute(user?.role)} className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 shrink-0" />
                    <span className="font-medium tracking-wider text-xs truncate">
                      {balance ? formatRupees(balance.balance_paise) : "₹0.00"}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            <SidebarMenuItem className="flex-1 min-w-0">
              <SidebarMenuButton
                tooltip="Toggle Theme"
                onClick={toggleTheme}
                className="h-10 text-muted-foreground hover:text-foreground justify-center group-data-[collapsible=icon]:justify-start"
              >
                {resolvedTheme === "dark" ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
                <span className="uppercase font-medium tracking-wider text-xs truncate">Theme</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </div>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  {user && (
                    <>
                      <Avatar className="h-8 w-8 rounded-full border border-primary/20 bg-primary/10 shrink-0">
                        <AvatarImage src={getMediaUrl(user.avatar_url)} alt={displayName} className="object-cover" />
                        <AvatarFallback className="text-primary font-bold text-xs">
                          {user.first_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                        <span className="truncate font-semibold flex items-center gap-2">
                          {displayName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground mt-0.5">
                          {user.email}
                        </span>
                      </div>
                    </>
                  )}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl border-border/30 shadow-xl bg-background/95 backdrop-blur-sm"
                side="right"
                align="end"
                sideOffset={4}
              >
                {user && (
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-full border border-primary/20 bg-primary/10 shrink-0">
                        <AvatarImage src={getMediaUrl(user.avatar_url)} alt={displayName} className="object-cover" />
                        <AvatarFallback className="text-primary font-bold text-xs">
                          {user.first_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                        <span className="truncate font-semibold flex items-center gap-2">
                          {displayName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground mt-0.5">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                )}
                <DropdownMenuSeparator className="bg-border/30" />
                {hasWalletPermission && (
                  <>
                    <DropdownMenuGroup>
                      <DropdownMenuItem asChild className="cursor-pointer py-2 group" onClick={handleNavClick}>
                        <Link to={getWalletRoute(user?.role)} className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <div className="w-8 flex items-center justify-start">
                              <Wallet className="h-4 w-4 text-muted-foreground group-hover:text-white dark:group-hover:text-black group-focus:text-white dark:group-focus:text-black transition-colors" />
                            </div>
                            <span className="font-medium">Wallet</span>
                          </div>
                          <span className={cn("text-xs font-bold", "text-primary")}>
                            {balance ? formatRupees(balance.balance_paise) : "₹0.00"}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator className="bg-border/30" />
                  </>
                )}
                <DropdownMenuItem asChild className="cursor-pointer group" onClick={handleNavClick}>
                  <Link to="/settings" className="flex items-center w-full">
                    <div className="w-8 flex items-center justify-start">
                      <Settings className="h-4 w-4 text-muted-foreground group-hover:text-white dark:group-hover:text-black group-focus:text-white dark:group-focus:text-black transition-colors" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Settings</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/30" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-500 focus:bg-red-100! focus:text-red-600! focus:**:text-red-600! dark:text-red-400 dark:focus:bg-red-950! dark:focus:text-red-300! dark:focus:**:text-red-300! cursor-pointer py-2 transition-colors"
                >
                  <div className="w-8 flex items-center justify-start">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span className="font-medium">Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
