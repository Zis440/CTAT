import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { HelmetProvider } from "react-helmet-async";
import { ThemeProvider } from "./app/providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWAInstallButton, PWAUpdatePrompt } from "./app/pwa";
import { router } from "./app/router";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { useSessionExpiration } from "./hooks/useSessionExpiration";

const queryClient = new QueryClient();

function App() {
  useSessionExpiration();

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
          <TooltipProvider>
            <ErrorBoundary>
              <RouterProvider router={router} />
            </ErrorBoundary>
          </TooltipProvider>
          <Toaster position="top-right" richColors closeButton />
          <PWAUpdatePrompt />
          <PWAInstallButton />
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

export default App;
