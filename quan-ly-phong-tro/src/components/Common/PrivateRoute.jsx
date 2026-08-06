import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ROLE_ROUTES = {
  SuperAdmin: '/admin',
  Landlord: '/landlord',
  Tenant: '/tenant',
};

export function PrivateRoute({ children, requiredRole }) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    const redirectTo = ROLE_ROUTES[user.role] || '/login';
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}

export function RoleRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  const redirectTo = ROLE_ROUTES[user.role] || '/login';
  return <Navigate to={redirectTo} replace />;
}
