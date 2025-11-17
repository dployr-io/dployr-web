import { Breadcrumbs } from "@/components/breadcrumbs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UserMenuContent } from "@/components/user-menu-content";
import { useInitials } from "@/hooks/use-initials";
import { useAuth } from "@/hooks/use-auth";
import type { BreadcrumbItem } from "@/types";
import { Menu } from "lucide-react";
import AppLogo from "@/components/app-logo";
import AppLogoIcon from "@/components/app-logo-icon";
import ThemeToggle from "@/components/theme-toggle";

interface AppHeaderProps {
  breadcrumbs?: BreadcrumbItem[];
}

export function AppHeader({ breadcrumbs = [] }: AppHeaderProps) {
  const getInitials = useInitials();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="border-b border-sidebar-border/80">
        <div className="mx-auto flex h-16 items-center px-4 md:max-w-7xl">
          {/* Mobile Menu */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-2 h-[34px] w-[34px]">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex h-full w-64 flex-col items-stretch justify-between bg-sidebar">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <SheetHeader className="flex justify-start text-left">
                  <AppLogoIcon className="h-6 w-6 fill-current text-black dark:text-white" />
                </SheetHeader>
              </SheetContent>
            </Sheet>
          </div>

          <a href={"/clusters"} className="flex items-center space-x-2">
            <AppLogo />
          </a>

          <div className="ml-auto flex items-center space-x-2">
            <div className="relative flex items-center space-x-1">
              <ThemeToggle />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-10 rounded-full p-1">
                  <Avatar className="size-8 overflow-hidden rounded-full">
                    <AvatarImage src={user.picture} alt={typeof user.name === "string" ? user.name : user.email} />
                    <AvatarFallback className="rounded-lg bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                      {getInitials(typeof user.name === "string" ? user.name : user.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <UserMenuContent user={user} />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      {breadcrumbs.length > 1 && (
        <div className="flex w-full border-b border-sidebar-border/70">
          <div className="mx-auto flex h-12 w-full items-center justify-start px-4 text-neutral-500 md:max-w-7xl">
            <Breadcrumbs breadcrumbs={breadcrumbs} />
          </div>
        </div>
      )}
    </>
  );
}
