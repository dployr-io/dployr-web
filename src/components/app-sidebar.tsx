import { NavFooter } from "@/components/nav-footer";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import { type NavItem } from "@/types";
import {
    Bell,
    BookOpen,
    BoxesIcon,
    CircleGauge,
    Container,
    Factory,
    FileSliders,
    FolderGit2,
    LayoutGrid,
    Logs,
    MessageCircleQuestion,
    SquareChevronRight,
} from "lucide-react";
import AppLogo from "./app-logo";

const mainNavItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutGrid,
    },
      {
        title: "Services",
        href: "/services",
        icon: BoxesIcon,
    },
    {
        title: "Deployments",
        href: "/deployments",
        icon: Factory,
    },
    {
        title: "Logs",
        href: "/logs",
        icon: Logs,
    },
    {
        title: "Console",
        href: "/console",
        icon: SquareChevronRight,
    },
];

const secondaryNavItems: NavItem[] = [
    {
        title: "Resources",
        href: "/resources",
        icon: CircleGauge,
    },
    {
        title: "Specs",
        href: "/specs",
        icon: FileSliders,
    },
    {
        title: "Notifications",
        href: "/notifications",
        icon: Bell,
    },
];

const footerNavItems: NavItem[] = [
    {
        title: "Support",
        href: "https://dployr.dev/support",
        icon: MessageCircleQuestion,
    },
    {
        title: "Docs",
        href: "https://dployr.dev/docs",
        icon: BookOpen,
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href={"/dashboard"}>
                                <AppLogo />
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} title="Platform" />
                <div className="h-4" />
                <NavMain items={secondaryNavItems} title="Resources" />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
