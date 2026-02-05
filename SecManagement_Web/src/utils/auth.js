// src/utils/auth.js

export function getToken() {
  return localStorage.getItem("token");
}

export function clearToken() {
  localStorage.removeItem("token");
}

// Decode base64url (JWT usa base64url, não base64 normal)
function base64UrlDecode(str) {
  try {
    const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    // padding
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const decoded = atob(padded);

    // lidar com UTF-8
    const bytes = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function decodeJwt(token) {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const payloadStr = base64UrlDecode(parts[1]);
  if (!payloadStr) return null;

  try {
    return JSON.parse(payloadStr);
  } catch {
    return null;
  }
}

// Tenta encontrar o role em vários nomes comuns de claim
export function getUserRoleFromToken(token) {
  const payload = decodeJwt(token);
  if (!payload) return null;

  const role =
    payload.role ||
    payload.Role ||
    payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"] ||
    null;

  // À prova de bala: alguns backends devolvem array de roles
  if (Array.isArray(role)) return role[0] ?? null;

  return role;
}

// Id do utilizador (NameIdentifier)
export function getUserIdFromToken(token) {
  const payload = decodeJwt(token);
  if (!payload) return null;

  // o vosso backend usa ClaimTypes.NameIdentifier
  const id =
    payload.sub ||
    payload.nameid ||
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
    payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/nameidentifier"] ||
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"] ||
    null;

  if (id == null) return null;

  const n = Number(id);
  return Number.isFinite(n) ? n : id; // devolve número quando possível
}

// Claims extra que o vosso backend adiciona no token
export function getFormandoIdFromToken(token) {
  const payload = decodeJwt(token);
  if (!payload) return null;

  const v = payload.FormandoId ?? payload["FormandoId"] ?? null;
  if (v == null) return null;

  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

export function getFormadorIdFromToken(token) {
  const payload = decodeJwt(token);
  if (!payload) return null;

  const v = payload.FormadorId ?? payload["FormadorId"] ?? null;
  if (v == null) return null;

  const n = Number(v);
  return Number.isFinite(n) ? n : v;
}

export function isFormandoFromToken(token) {
  const payload = decodeJwt(token);
  if (!payload) return false;

  return payload.IsFormando === "true" || payload.IsFormando === true;
}

export function isFormadorFromToken(token) {
  const payload = decodeJwt(token);
  if (!payload) return false;

  return payload.IsFormador === "true" || payload.IsFormador === true;
}

export function isTokenExpired(token) {
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== "number") return false;

  // exp é epoch seconds
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSec;
}
