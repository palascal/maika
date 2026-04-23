import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AdminPlayersPage } from "./AdminPlayersPage";

export function AdminPlayersGate() {
  const { isAdmin } = useAuth();
  if (!isAdmin) return <Navigate to="/" replace />;
  return <AdminPlayersPage />;
}
