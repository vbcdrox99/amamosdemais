import { ReactNode } from "react";
import { useAuthRole } from "@/hooks/useAuthRole";
import { Navigate } from "react-router-dom";

type Props = {
  minLevel: 1 | 2 | 3;
  children: ReactNode;
};

export const RouteGuard = ({ minLevel, children }: Props) => {
  const { loading, level } = useAuthRole();
  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Carregando...</div>;
  }
  if (level < minLevel) {
    return <Navigate to="/auth" replace />;
  }
  return <>{children}</>;
};