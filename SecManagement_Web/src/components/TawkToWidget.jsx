import { useEffect } from "react";
import { getToken } from "../utils/auth";

const TAWK_SRC = "https://embed.tawk.to/697f5ccc4e9be91c36a9db3a/1jgco4vo1";

export default function TawkToWidget() {
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // evita duplicar
    if (window.Tawk_API || document.getElementById("tawkto-script")) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const s1 = document.createElement("script");
    s1.id = "tawkto-script";
    s1.async = true;
    s1.src = TAWK_SRC;
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");

    document.body.appendChild(s1);

    // cleanup (quando saíres do dashboard / logout)
    return () => {
      try {
        const el = document.getElementById("tawkto-script");
        if (el) el.remove();
      } catch {}

      // remove iframes do widget (para não ficar “preso” na UI)
      try {
        document
          .querySelectorAll('iframe[src*="tawk.to"], iframe[title*="tawk"]')
          .forEach((f) => f.remove());
      } catch {}

      try {
        delete window.Tawk_API;
        delete window.Tawk_LoadStart;
      } catch {}
    };
  }, []);

  return null;
}
