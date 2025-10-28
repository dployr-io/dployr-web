import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { type NavItem } from '@/types';
import { type PropsWithChildren } from 'react';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href:'',
        icon: null,
    },
    {
        title: 'Password',
        href: '',
        icon: null,
    },
    {
        title: 'System',
        href: '',
        icon: null,
    },
    {
        title: 'Configuration',
        href: '',
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const version  = "1.0.0";

    // When server-side rendering, we only render the layout on the client...
    if (typeof window === 'undefined') {
        return null;
    }

    return (
        <div className="flex flex-1 flex-col items-center px-4 py-6">
            <div className="flex w-full max-w-6xl flex-col lg:flex-row lg:space-x-12">
                <aside className="w-full max-w-xl lg:w-48">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${typeof item.href === item.href}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn('w-full justify-start', {
                                    'bg-muted': currentPath === item.href,
                                })}
                            >
                                <a href={item.href}>
                                    {item.icon && <item.icon className="h-4 w-4" />}
                                    {item.title}
                                </a>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="flex-1">
                    <section className="w-full space-y-12">{children}</section>
                </div>
            </div>
            <div className="mt-auto flex w-full justify-center">
                <p className="text-xs text-muted-foreground">Version {version}</p>
            </div>
        </div>
    );
}
