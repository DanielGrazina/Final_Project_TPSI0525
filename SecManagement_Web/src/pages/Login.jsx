import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { GoogleLogin } from "@react-oauth/google";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const [error, setError] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  function readApiMessage(err, fallback) {
    const data = err?.response?.data;

    // quando a API devolve string simples (ex: "Credenciais inválidas.")
    if (typeof data === "string") return data;

    // quando devolve objeto { message: "..." } ou { Message: "..." }
    return data?.message || data?.Message || fallback;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Nota: o backend usa dto.TwoFactorCode, mas o binder costuma aceitar camelCase
      const payload = {
        email,
        password,
        twoFactorCode: requires2FA ? twoFactorCode : "", // só envia se estiver no passo 2
      };

      const response = await api.post("/Auth/login", payload);

      // Compatível com camelCase e PascalCase
      const requiresTwoFactor =
        response.data?.requiresTwoFactor ?? response.data?.RequiresTwoFactor ?? false;

      // O teu backend novo pode devolver 200 com requiresTwoFactor = true
      if (requiresTwoFactor || response.status === 202) {
        setRequires2FA(true);
        setTwoFactorCode("");
        return;
      }

      const token = response.data?.token || response.data?.Token;

      if (!token) {
        setError(response.data?.message || response.data?.Message || "Login falhou: token não recebido.");
        return;
      }

      localStorage.setItem("token", token);
      navigate("/dashboard");
    } catch (err) {
      setError(readApiMessage(err, "Erro no login. Verifica as credenciais."));
      if (requires2FA) setTwoFactorCode("");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSuccess(credentialResponse) {
    setError("");
    setLoading(true);

    try {
      const idToken = credentialResponse?.credential;
      if (!idToken) {
        setError("Não foi possível obter credenciais do Google.");
        return;
      }

      // Mantém o teu formato atual
      const response = await api.post("/Auth/google", { IdToken: idToken });

      const token = response.data?.token || response.data?.Token;
      if (!token) {
        setError(response.data?.message || response.data?.Message || "Login Google falhou: token não recebido.");
        return;
      }

      localStorage.setItem("token", token);
      navigate("/dashboard");
    } catch (err) {
      console.log("GOOGLE STATUS:", err.response?.status);
      console.log("GOOGLE DATA:", err.response?.data);

      setError(readApiMessage(err, "Erro no login Google."));
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleError() {
    setError("Falha no login Google.");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-600">ATEC Gestão</h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {!requires2FA ? (
            <>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Email</label>
                <input
                  type="email"
                  required
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                <input
                  type="password"
                  required
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />

                <div className="text-right mt-1">
                  <Link to="/forgot-password" className="text-xs text-blue-500 hover:underline">
                    Esqueci-me da password
                  </Link>
                </div>
              </div>
            </>
          ) : (
            <div className="animate-pulse">
              <label className="block text-gray-700 font-bold mb-2 text-center">
                Código Google Authenticator
              </label>
              <input
                type="text"
                autoFocus
                className="w-full p-3 border-2 border-blue-300 rounded text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                maxLength={6}
                disabled={loading}
              />
              <p className="text-xs text-gray-500 text-center mt-2">
                Abre a app no teu telemóvel para ver o código.
              </p>

              <div className="text-center mt-3">
                <button
                  type="button"
                  onClick={() => {
                    setRequires2FA(false);
                    setTwoFactorCode("");
                    setError("");
                  }}
                  className="text-xs text-blue-600 hover:underline"
                  disabled={loading}
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded hover:bg-blue-700 transition duration-200 disabled:opacity-60"
          >
            {loading ? "A processar..." : requires2FA ? "Validar Código" : "Entrar"}
          </button>
        </form>

        {!requires2FA && (
          <div className="mt-6 border-t pt-4">
            <p className="text-center text-sm text-gray-400 mb-3">Ou entrar com</p>

            <div className="flex justify-center">
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-sm">
          Ainda não tens conta?{" "}
          <Link to="/register" className="text-blue-500 hover:underline">
            Registar
          </Link>
        </p>
      </div>
    </div>
  );
}
