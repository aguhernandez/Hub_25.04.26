import { ReactNode, useEffect } from 'react';
import type { UserRole } from '../types/roles';
import { useUserRole } from '../hooks/useUserRole';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { role, loading } = useUserRole();

  useEffect(() => {
    if (!loading && role && !allowedRoles.includes(role)) {
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));
    }
  }, [allowedRoles, loading, role]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!role || !allowedRoles.includes(role)) return null;
  return <>{children}</>;
}
