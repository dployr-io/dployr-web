import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { type NavItem } from "@/types";
import { type PropsWithChildren } from "react";
import { Link, useLocation } from "@tanstack/react-router";

const sidebarNavItems: NavItem[] = [
    {
        title: "Profile",
        href: "/settings/profile",
        icon: null,
    },
    {
        title: "Users",
        href: "/settings/users",
        icon: null,
    },
    {
        title: "Configuration",
        href: "/settings/config",
        icon: null,
    },
    {
        title: "Integrations",
        href: "/settings/integrations",
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const location = useLocation();

    return (
        <div className="flex h-full min-h-0 flex-col px-4 pt-6">
            <div className="flex w-full max-w-6xl flex-col lg:flex-row lg:space-x-12 flex-1">
                <aside className="w-full shrink-0 max-w-xl lg:w-48 lg:sticky lg:top-6 lg:self-start">
                    <nav className="flex flex-col space-y-1 space-x-0">
                        {sidebarNavItems.map((item, index) => (
                            <Button
                                key={`${item.href}-${index}`}
                                size="sm"
                                variant="ghost"
                                asChild
                                className={cn("w-full justify-start", {
                                    "bg-muted": location.pathname === item.href,
                                })}
                            >
                                <Link to={item.href}>
                                    {item.icon && (
                                        <item.icon className="h-4 w-4" />
                                    )}
                                    {item.title}
                                </Link>
                            </Button>
                        ))}
                    </nav>
                </aside>

                <Separator className="my-6 lg:hidden" />

                <div className="flex-1 min-h-0">
                    <section className="w-full space-y-12 overflow-y-auto max-h-full">{children}</section>
                </div>
            </div>
            <footer className="lg:sticky lg:bottom-0 border-t min-h-12 bg-background/80 backdrop-blur-sm -mx-4 px-4">
                <div className="flex w-full justify-center py-3">
                    <div className="flex space-x-6 text-xs text-muted-foreground">
                        <a
                            href="https://status.dployr.dev"
                            className="hover:underline"
                        >
                            Status
                        </a>
                        <span className="text-border">•</span>
                        <a
                            href="https://dployr.dev/changelog"
                            className="hover:underline"
                        >
                            Changelog
                        </a>
                        <span className="text-border">•</span>
                        <a
                            href="https://dployr.dev/terms"
                            className="hover:underline"
                        >
                            Terms of Use
                        </a>
                        <span className="text-border">•</span>
                        <a
                            href="https://dployr.dev/privacy"
                            className="hover:underline"
                        >
                            Privacy Policy
                        </a>
                        <span className="text-border">•</span>
                        <a
                            href="https://docs.dployr.dev"
                            className="hover:underline"
                        >
                            Docs
                        </a>
                        <span className="text-border">•</span>
                        <a
                            href="https://dployr.dev/support"
                            className="hover:underline"
                        >
                            Support
                        </a>
                    </div>
                </div>
            </footer>
        </div>
    );
}

