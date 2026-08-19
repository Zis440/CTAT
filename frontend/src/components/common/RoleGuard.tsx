// src/components/auth/RoleGuard.tsx
// Renders children only if current user has one of the allowed roles.
// Use for conditional UI inside components (not for routing).
import { useCurrentUser } from '@/store/useAuthStore';
import type { UserRole } from '@/types/auth';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const user = useCurrentUser();
  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
