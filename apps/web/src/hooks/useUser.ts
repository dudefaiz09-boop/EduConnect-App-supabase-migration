import { useAuth } from './useAuth';

export function useUser() {
  const auth = useAuth();
  return {
    user: auth.user,
    role: auth.role,
    roles: auth.roles,
    permissions: auth.permissions,
    loading: auth.loading,
  };
}
