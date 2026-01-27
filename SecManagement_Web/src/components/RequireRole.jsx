import { Navigate } from "react-router-dom";
import { getToken, getUserRoleFromToken, isTokenExpired } from "../utils/auth";

export default function RequireRole({ allow = [], children }) {
  const token = getToken();

  if (!token || isTokenExpired(token)) {
    return <Navigate to="/" replace />;
  }

  const role = getUserRoleFromToken(token);

  // Se allow estiver vazio, deixa passar
  if (!Array.isArray(allow) || allow.length === 0) return children;

  if (role && allow.includes(role)) return children;

  return <Navigate to="/dashboard" replace />;
}
