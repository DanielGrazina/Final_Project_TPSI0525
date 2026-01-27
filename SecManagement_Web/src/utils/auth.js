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

  // alguns backends usam estas chaves:
  return (
    payload.role ||
    payload.Role ||
    payload["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    payload["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"] ||
    null
  );
}

export function isTokenExpired(token) {
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== "number") return false;

  // exp é epoch seconds
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp <= nowSec;
}
