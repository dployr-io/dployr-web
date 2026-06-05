// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { NavFooter } from "@/components/nav-footer";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { type NavItem } from "@/types";
import { ActivitySquare, BookOpen, BoxesIcon, ChevronsUpDown, LayoutGrid, MessageCircleQuestion, Server, Settings2, SquareChevronRight } from "lucide-react";
import AppLogo from "./app-logo";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { useClusterId } from "@/hooks/use-cluster-id";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { useClusterName } from "@/hooks/use-cluster-name";

export function AppSidebar() {
  const clusterId = useClusterId();
  const clusterName = useClusterName();
  const { clusters } = useAuth();

  
  const { hasConsole } = usePlanFeatures();

  const mainNavItems: NavItem[] = [
    {
      title: "Dashboard",
      href: clusterId ? "/clusters/$clusterId/dashboard" : "/dashboard",
      icon: LayoutGrid,
    },
    {
      title: "Services",
      href: clusterId ? "/clusters/$clusterId/services" : "/services",
      icon: BoxesIcon,
    },
    {
      title: "Console",
      href: clusterId ? "/clusters/$clusterId/console" : "/console",
      icon: SquareChevronRight,
      badge: hasConsole ? undefined : "Pro",
    },
  ];

  const secondaryNavItems: NavItem[] = [
     {
      title: "Instances",
      href: clusterId ? "/clusters/$clusterId/instances" : "/instances",
      icon: Server,
    },
    {
      title: "Events",
      href: clusterId ? "/clusters/$clusterId/events" : "/events",
      icon: ActivitySquare,
    },
    {
      title: "Settings",
      href: clusterId ? "/clusters/$clusterId/settings" : "/settings",
      icon: Settings2,
    },
  ];

  const footerNavItems: NavItem[] = [
    {
      title: "Docs",
      href: "https://dployr.io/docs/quickstart",
      icon: BookOpen,
    },
    {
      title: "Support",
      href: "https://discord.gg/tY8ZbjvrSZ",
      icon: MessageCircleQuestion,
    },
  ];

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2 text-left text-sm rounded-md hover:bg-accent">
              <AppLogo />
              {clusterName && <span className="text-sm font-medium truncate">{clusterName}</span>}
              <ChevronsUpDown className="ml-auto size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel className="p-y-2 font-normal">Clusters</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {clusters?.map(cluster => (
              <DropdownMenuItem key={cluster.id} asChild>
                <Link to="/clusters/$clusterId/dashboard" params={{ clusterId: cluster.id }} className={`flex items-center gap-2 w-full cursor-pointer ${cluster.id === clusterId ? "bg-accent" : ""}`}>
                  {clusterId === cluster.id && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                  <span className="truncate">{cluster.name}</span>
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={mainNavItems} title="Platform" clusterId={clusterId || undefined} />
        <div className="h-4" />
        <NavMain items={secondaryNavItems} title="Resources" clusterId={clusterId || undefined} />
      </SidebarContent>

      <SidebarFooter>
        <NavFooter items={footerNavItems} className="mt-auto" />
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
