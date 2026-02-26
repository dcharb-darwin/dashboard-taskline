import { cn } from "@/lib/utils";
import { useBranding } from "@/lib/BrandingContext";
import { useViewMode } from "@/contexts/ViewModeContext";
import { FolderKanban, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "./ui/button";
import CommandPalette from "./CommandPalette";

type AppLayoutProps = {
  children: ReactNode;
  contentClassName?: string;
  showNewProjectButton?: boolean;
};

const navItems = [
  { label: "Dashboard", path: "/" },
  { label: "Projects", path: "/projects" },
  { label: "Templates", path: "/templates" },
  { label: "Tasks", path: "/tasks" },
  { label: "Calendar", path: "/calendar" },
  { label: "Gantt", path: "/gantt" },
  { label: "Admin", path: "/admin" },
];

const isActiveRoute = (location: string, path: string) => {
  if (path === "/") return location === "/";
  return location === path || location.startsWith(`${path}/`);
};

export function AppLayout({
  children,
  contentClassName,
  showNewProjectButton = true,
}: AppLayoutProps) {
  const [location] = useLocation();
  const { appName, logoUrl } = useBranding();
  const { viewMode, setViewMode, isMvp } = useViewMode();

  const visibleNavItems = isMvp
    ? navItems.filter((item) => item.label !== "Tasks" && item.label !== "Admin")
    : navItems;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="sticky top-0 z-20 border-b bg-white/90 backdrop-blur-sm">
        <div className="container py-3 md:py-0">
          <div className="flex flex-col gap-3 md:h-16 md:flex-row md:items-center md:justify-between">
            <Link href="/">
              <span className="inline-flex items-center gap-2 text-left">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-7 w-7 rounded object-contain" />
                ) : (
                  <FolderKanban className="h-6 w-6 text-blue-600" />
                )}
                <span className="text-xl font-bold">{appName}</span>
              </span>
            </Link>

            <div className="flex items-center justify-between gap-3">
              <nav className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                {visibleNavItems.map((item) => {
                  const active = isActiveRoute(location, item.path);
                  return (
                    <Button asChild key={item.path} size="sm" variant={active ? "secondary" : "ghost"}>
                      <Link href={item.path}>{item.label}</Link>
                    </Button>
                  );
                })}
              </nav>

              <div className="inline-flex overflow-hidden rounded-full border border-gray-200">
                <button
                  type="button"
                  className={cn(
                    "px-3 py-1 text-xs font-medium transition-colors",
                    viewMode === "mvp"
                      ? "bg-blue-600 text-white"
                      : "bg-transparent text-gray-600 hover:bg-gray-100"
                  )}
                  onClick={() => setViewMode("mvp")}
                >
                  MVP
                </button>
                <button
                  type="button"
                  className={cn(
                    "px-3 py-1 text-xs font-medium transition-colors",
                    viewMode === "vision"
                      ? "bg-blue-600 text-white"
                      : "bg-transparent text-gray-600 hover:bg-gray-100"
                  )}
                  onClick={() => setViewMode("vision")}
                >
                  Vision
                </button>
              </div>

              {showNewProjectButton ? (
                <Button asChild size="sm">
                  <Link href="/projects/new">
                    <Plus className="mr-2 h-4 w-4" />
                    New Project
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className={cn("container py-8", contentClassName)}>{children}</main>
      <CommandPalette />
    </div>
  );
}
