import { useAtomValue } from "jotai";
import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticatedAtom } from "@/store/authAtoms";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAtomValue(isAuthenticatedAtom);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
