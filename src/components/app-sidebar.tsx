// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { NavFooter } from "@/components/nav-footer";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { type NavItem } from "@/types";
import { ActivitySquare, BookOpen, BoxesIcon, ChevronsUpDown, CircleGauge, Factory, LayoutGrid, Logs, MessageCircleQuestion, Server, Settings2, SquareChevronRight } from "lucide-react";
import AppLogo from "./app-logo";
import { useClusterContext } from "@/hooks/use-cluster-context";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";

export function AppSidebar() {
  const { clusterId } = useClusterContext();
  const { clusters } = useAuth();

  function getClusterName(
    clusters: {
      id: string;
      name: string;
      owner: string;
    }[]
  ) {
    let name = "";
    clusters.forEach(cluster => {
      if (cluster.id === clusterId) {
        name = cluster.name;
      }
    });
    return name;
  }

  const clusterName = getClusterName(clusters);

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
      title: "Deployments",
      href: clusterId ? "/clusters/$clusterId/deployments" : "/deployments",
      icon: Factory,
    },
    {
      title: "Console",
      href: clusterId ? "/clusters/$clusterId/console" : "/console",
      icon: SquareChevronRight,
    },
  ];

  const secondaryNavItems: NavItem[] = [
     {
      title: "Instances",
      href: clusterId ? "/clusters/$clusterId/instances" : "/instances",
      icon: Server,
    },
    {
      title: "Graph",
      href: clusterId ? "/clusters/$clusterId/graph" : "/graph",
      icon: CircleGauge,
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
      href: "https://docs.dployr.io",
      icon: BookOpen,
    },
    {
      title: "Support",
      href: "https://dployr.io/support",
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
