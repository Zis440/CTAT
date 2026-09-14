import { Link, Outlet } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/providers";
import { Button } from "@/components/ui/button";

export function Layout() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-text flex flex-col font-sans">
      <header className="sticky top-0 z-50 w-full border-b backdrop-blur-md bg-background/80 transition-colors">
        <div className="container mx-auto px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between max-w-[1440px]">
          <Link to="/" className="flex items-center gap-2">
            <img src="/coretat-logo.png" alt="CoreTAT Logo" className="h-8 w-auto hidden dark:block" />
            <img src="/coretat-report-logo.png" alt="CoreTAT Logo" className="h-8 w-auto block dark:hidden" />
          </Link>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-5 w-5 text-accent" />
              ) : (
                <Moon className="h-5 w-5 text-accent" />
              )}
            </Button>

          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
        <Outlet />
      </main>

      <footer className="border-t py-6 bg-background/50">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          CoreTAT © {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
