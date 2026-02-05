import { Navigate, useLocation } from "react-router-dom";
import { getToken, getUserRoleFromToken, isTokenExpired } from "../utils/auth";

function normalizeRole(role) {
  return String(role || "").trim().toLowerCase();
}

export default function RequireRole({ allow = [], children }) {
  const location = useLocation();
  const token = getToken();

  // Sem token / token expirado -> login
  if (!token || isTokenExpired(token)) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  const role = getUserRoleFromToken(token);
  const myRole = normalizeRole(role);

  // Se não especificares allow, deixa passar (qualquer autenticado)
  if (!Array.isArray(allow) || allow.length === 0) return children;

  // SuperAdmin passa sempre (conforme o teu requisito)
  if (myRole === "superadmin") return children;

  // Normalizar allow
  const allowSet = new Set(allow.map(normalizeRole));

  // Se role não existir no token, bloqueia
  if (!myRole) return <Navigate to="/dashboard" replace />;

  // Match normal
  if (allowSet.has(myRole)) return children;

  // Sem permissão
  return <Navigate to="/dashboard" replace />;
}
