import { Link, useNavigate, useLocation } from "react-router-dom";
import { Moon, Sun, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { useTheme } from "@/app/providers";
import { Button } from "@/components/ui/button";

export function LandingNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/80 transition-colors">
        <div className="container mx-auto px-6 lg:px-10 h-16 flex items-center justify-between max-w-[1440px]">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img
              src="/psyichub-logo-v2.png"
              alt="Psyichub Logo"
              className="h-14 md:h-16 w-auto dark:filter-none" style={{ filter: "brightness(0) saturate(100%) invert(33%) sepia(43%) saturate(935%) hue-rotate(70deg) brightness(100%) contrast(83%)" }}
            />
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden md:flex rounded-full items-center justify-center gap-2">

              {!(location.pathname === "/login" || location.pathname === "/sign-up" || location.pathname.includes("/auth") || location.pathname.includes("/reset-password")) && (
                <NavigationMenu>
                  <NavigationMenuList>
                    <NavigationMenuItem>
                      <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                        <Link to="/about">Platform</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                        <Link to="/how-to-use">User Guide</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                    <NavigationMenuItem>
                      <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
                        <Link to="/team">Our Team</Link>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  </NavigationMenuList>
                </NavigationMenu>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-text hover:bg-primary/10 dark:hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
            >
              {resolvedTheme === "dark" ? (
                <Moon className="h-5 w-5 text-accent" />
              ) : (
                <Sun className="h-5 w-5 text-accent" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-text hover:bg-primary/10 dark:hover:bg-primary/10 hover:text-primary rounded-full transition-colors"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 top-[64px] z-40 backdrop-blur-sm bg-background/5"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="md:hidden fixed right-0 top-[64px] bottom-0 w-[80%] max-w-sm z-50 bg-background/95 backdrop-blur-xl border-l border-border/50 shadow-2xl"
            >
              <div className="flex flex-col h-full">

                <div className="flex items-center justify-between px-6 h-14 border-b border-border/10 bg-background/40 backdrop-blur-md">
                  <span className="text-xs font-bold uppercase tracking-widest text-text/50">Navigation</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex flex-col p-6 gap-4 overflow-y-auto">
                  {!(location.pathname === "/login" || location.pathname === "/sign-up" || location.pathname.includes("/auth") || location.pathname.includes("/reset-password")) && (
                    <>
                      <Button
                        asChild
                        variant="ghost"
                        className={`justify-start text-lg py-6 ${location.pathname === "/about" ? "text-secondary font-bold" : "text-text"}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Link to="/about">Platform</Link>
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        className={`justify-start text-lg py-6 ${location.pathname === "/how-to-use" ? "text-secondary font-bold" : "text-text"}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Link to="/how-to-use">User Guide</Link>
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        className={`justify-start text-lg py-6 ${location.pathname === "/team" ? "text-secondary font-bold" : "text-text"}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Link to="/team">Our Team</Link>
                      </Button>
                    </>
                  )}

                  <div className="mt-auto pt-4 border-t border-border/50">
                    <Button
                      asChild
                      variant="secondary"
                      className="w-full justify-center text-lg py-6 rounded-xl shadow-lg"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Link to="/auth">Login</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
