// Copyright 2025 Emmanuel Madehin
// SPDX-License-Identifier: Apache-2.0

import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link } from '@tanstack/react-router';

export function NavMain({ items = [], title, clusterId }: { items: NavItem[]; title: string; clusterId?: string }) {
    return (
        <SidebarGroup className="px-2 py-0">
            <SidebarGroupLabel>{title}</SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => {
                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                asChild
                                tooltip={{ children: item.title }}
                            >
                                {item.href.startsWith('http') ? (
                                    <a href={item.href} target="_blank" rel="noopener noreferrer">
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </a>
                                ) : (
                                    <Link to={item.href} params={clusterId ? { clusterId } : undefined}>
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
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
