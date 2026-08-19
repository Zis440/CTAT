import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModuleGuardProps {
  children: React.ReactNode;
  moduleKey: string;
}

export function ModuleGuard({ children, moduleKey }: ModuleGuardProps) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  // If user is not staff, they bypass this guard
  const isStaff = user?.role.includes("staff");

  // If staff, check if they have the specific module permission
  const hasPermission = !isStaff || !!user?.module_permissions?.[moduleKey];

  useEffect(() => {
    if (!hasPermission) {
      const timer = setTimeout(() => {
        let fallback = "/dashboard";
        if (user?.role === "super_admin") fallback = "/admin";
        else if (user?.role === "clinic_admin") fallback = "/clinic/dashboard";
        else if (user?.role === "clinic_staff") fallback = "/clinic-staff/dashboard";
        else if (user?.role === "org_admin") fallback = "/org/dashboard";
        else if (user?.role === "org_staff") fallback = "/org-staff/dashboard";
        navigate(fallback, { replace: true });
      }, 3000); // 3 seconds redirect

      return () => clearTimeout(timer);
    }
  }, [hasPermission, navigate, user]);

  if (!hasPermission) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="max-w-md w-full text-center space-y-5 bg-background/50 backdrop-blur-sm p-8 rounded-2xl border border-border shadow-sm">
          <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold tracking-tight text-text">
              Access Denied
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You are not authorized to visit this page. You do not have the required module permissions.
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-4">
              <Loader2 className="h-3 w-3 animate-spin" />
              Redirecting to dashboard automatically...
            </div>
          </div>
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              className="border-primary/20 font-bold"
              onClick={() => {
                let fallback = "/dashboard";
                if (user?.role === "super_admin") fallback = "/admin";
                else if (user?.role === "clinic_admin") fallback = "/clinic/dashboard";
                else if (user?.role === "clinic_staff") fallback = "/clinic-staff/dashboard";
                else if (user?.role === "org_admin") fallback = "/org/dashboard";
                else if (user?.role === "org_staff") fallback = "/org-staff/dashboard";
                navigate(fallback, { replace: true });
              }}
            >
              Go to Dashboard Now
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
