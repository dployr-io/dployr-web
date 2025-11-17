import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { UserInfo } from "@/components/user-info";
import { useMobileNavigation } from "@/hooks/use-mobile-navigation";
import { useAuth } from "@/hooks/use-auth";
import { type User } from "@/types";
import { LogOut, Settings } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface UserMenuContentProps {
  user: User;
  clusterId?: string;
}

export function UserMenuContent({ user, clusterId }: UserMenuContentProps) {
  const cleanup = useMobileNavigation();
  const { logout } = useAuth();

  const handleLogout = () => {
    cleanup();
    logout();
  };

  return (
    <>
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
          <UserInfo user={user} showEmail={true} />
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      {clusterId && (
        <>
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link className="block w-full" to="/clusters/$clusterId/settings/profile" params={{ clusterId }} onClick={cleanup}>
                <Settings className="mr-2" />
                Settings
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
        </>
      )}
      <DropdownMenuItem onClick={handleLogout}>
        <LogOut className="mr-2" />
        Log out
      </DropdownMenuItem>
    </>
  );
}
