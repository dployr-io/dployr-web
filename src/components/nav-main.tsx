// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, useMatchRoute } from '@tanstack/react-router';

export function NavMain({ items = [], title, clusterId }: { items: NavItem[]; title: string; clusterId?: string }) {
    const matchRoute = useMatchRoute();

    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>{title}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    const isActive = !item.href.startsWith('http') && !!matchRoute({
                        to: item.href,
                        params: clusterId ? { clusterId } : undefined,
                        fuzzy: true,
                    });

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                isActive={isActive}
                                tooltip={{ children: item.title }}
                            >
                                {item.href.startsWith('http') ? (
                                    <a href={item.href} target="_blank" rel="noopener noreferrer">
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        {item.badge && (
                                            <span className="ml-auto rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground leading-none">
                                                {item.badge}
                                            </span>
                                        )}
                                    </a>
                                ) : (
                                    <Link to={item.href} params={clusterId ? { clusterId } : undefined}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                        {item.badge && (
                                            <span className="ml-auto rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground leading-none">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                )}
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
