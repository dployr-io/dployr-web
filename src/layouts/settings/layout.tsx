import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { type PropsWithChildren } from 'react';
import { Link, useLocation } from '@tanstack/react-router';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: '/settings/profile',
        icon: null,
    },
    {
        title: 'Users',
        href: '/settings/users',
        icon: null,
    },
    {
        title: 'Configuration',
        href: '/settings/config',
        icon: null,
    },
    {
        title: 'Integrations',
        href: '/settings/integrations',
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const location = useLocation();

    return (
        <div className="flex flex-1 flex-col items-center px-4 py-6">
            <div className="flex w-full max-w-6xl flex-col lg:flex-row lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${item.href}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': location.pathname === item.href,
                                })}
                            >
                                <Link to={item.href}>
                                    {item.icon && <item.icon className="h-4 w-4" />}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="flex-1">
                    <section className="w-full space-y-12">{children}</section>
                </div>
            </div>
            <footer className="mt-auto flex w-full justify-center">

                <div className="flex space-x-4 text-xs text-muted-foreground">
                    <a href="https://status.dployr.dev" className="hover:underline">Status</a>
                    <a href="https://dployr.dev/changelog" className="hover:underline">Changelog</a>
                    <a href="https://dployr.dev/terms" className="hover:underline">Terms of Use</a>
                    <a href="https://dployr.dev/privacy" className="hover:underline">Privacy Policy</a>
                    <a href="https://docs.dployr.dev" className="hover:underline">Docs</a>
                    <a href="https://dployr.dev/support" className="hover:underline">Support</a>
                </div>

            </footer>
        </div>
    );
}
