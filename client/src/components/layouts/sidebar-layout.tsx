import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Users, 
  Link as LinkIcon, 
  UserSearch, 
  Search, 
  History, 
  Settings, 
  LogOut,
  Bell,
  Menu,
  X
} from "lucide-react";

type SidebarLayoutProps = {
  children: React.ReactNode;
  role: "admin" | "sdr";
};

export default function SidebarLayout({ children, role }: SidebarLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Listen for screen size changes
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    
    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

  // Close mobile menu when navigation occurs
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  const adminNavItems = [
    { href: "/admin", icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard" },
    { href: "/admin/sdrs", icon: <Users className="h-5 w-5" />, label: "SDR Management" },
    { href: "/admin/channels", icon: <LinkIcon className="h-5 w-5" />, label: "Channels" },
    { href: "/admin/prospects", icon: <UserSearch className="h-5 w-5" />, label: "Prospects" },
  ];

  const sdrNavItems = [
    { href: "/sdr", icon: <LayoutDashboard className="h-5 w-5" />, label: "Dashboard" },
    { href: "/sdr/search", icon: <Search className="h-5 w-5" />, label: "Prospect Search" },
    { href: "/sdr/prospects", icon: <UserSearch className="h-5 w-5" />, label: "My Prospects" },
    { href: "/sdr/history", icon: <History className="h-5 w-5" />, label: "Activity History" },
  ];

  const navItems = role === "admin" ? adminNavItems : sdrNavItems;

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.username) return "U";
    
    const parts = user.username.split(/[ ._-]/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="bg-white shadow-md"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>
      
      {/* Sidebar - desktop always visible, mobile conditionally visible */}
      <div
        className={cn(
          "w-64 bg-white shadow-md z-10 border-r border-neutral-200 flex flex-col",
          isMobile ? "fixed inset-y-0 left-0 transform transition-transform duration-300 ease-in-out" : "relative",
          isMobile && !isMobileMenuOpen ? "-translate-x-full" : "translate-x-0"
        )}
      >
        <div className="px-6 py-4 border-b border-neutral-200">
          <h1 className="text-xl font-semibold text-neutral-900">AI-SDR</h1>
          <p className="text-xs text-neutral-500">{role === "admin" ? "Admin Dashboard" : "SDR Dashboard"}</p>
        </div>
        
        <nav className="mt-5 px-4 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a
                  className={cn(
                    "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                    location === item.href
                      ? "bg-primary-50 text-primary-700"
                      : "text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
                  )}
                >
                  <span
                    className={cn(
                      "mr-3 text-lg",
                      location === item.href ? "text-primary-500" : "text-neutral-500"
                    )}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </a>
              </Link>
            ))}
            
            <Link href={role === "admin" ? "/admin/settings" : "/sdr/settings"}>
              <a className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900">
                <Settings className="mr-3 text-neutral-500 h-5 w-5" />
                Settings
              </a>
            </Link>
            
            <button
              onClick={() => logoutMutation.mutate()}
              className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900"
            >
              <LogOut className="mr-3 text-neutral-500 h-5 w-5" />
              Logout
            </button>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
            <div className="flex-1 flex">
              <div className="max-w-2xl w-full lg:max-w-xs">
                <label htmlFor="search" className="sr-only">Search</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-neutral-400" />
                  </div>
                  <Input
                    id="search"
                    name="search"
                    className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md"
                    placeholder="Search"
                    type="search"
                  />
                </div>
              </div>
            </div>
            <div className="ml-4 flex items-center md:ml-6">
              <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-neutral-500">
                <span className="sr-only">View notifications</span>
                <Bell className="h-5 w-5" />
              </Button>

              {/* Profile */}
              <div className="ml-3 relative">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary-100 text-primary-700">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm font-medium text-neutral-700">
                    {user?.username}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
