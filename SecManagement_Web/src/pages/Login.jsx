import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import { GoogleLogin } from "@react-oauth/google";
import useTheme from "../hooks/useTheme";
import ThemeToggle from "../components/ThemeToggle";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const [error, setError] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  function readApiMessage(err, fallback) {
    const data = err?.response?.data;
    if (typeof data === "string") return data;
    return data?.message || data?.Message || fallback;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        email,
        password,
        twoFactorCode: requires2FA ? twoFactorCode : "",
      };

      const response = await api.post("/Auth/login", payload);

      const requiresTwoFactor =
        response.data?.requiresTwoFactor ?? response.data?.RequiresTwoFactor ?? false;

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      
      {/* Theme toggle in top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <div className="relative w-full max-w-md px-4">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl border dark:border-gray-800">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mb-4 shadow-lg shadow-blue-500/30">
              <span className="text-2xl font-bold text-white">AM</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">ATEC Gestão</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {requires2FA ? "Autenticação de dois fatores" : "Bem-vindo de volta"}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {!requires2FA ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    <input
                      type="email"
                      required
                      className="w-full pl-10 pr-4 py-3 border rounded-lg
                                 bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                                 text-gray-900 dark:text-gray-100
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow
                                 disabled:opacity-60"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={loading}
                      placeholder="exemplo@atec.pt"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <input
                      type="password"
                      required
                      className="w-full pl-10 pr-4 py-3 border rounded-lg
                                 bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                                 text-gray-900 dark:text-gray-100
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow
                                 disabled:opacity-60"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="text-right mt-2">
                    <Link to="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                      Esqueci-me da password
                    </Link>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 mb-3">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <label className="block text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                    Código Google Authenticator
                  </label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Abre a app no teu telemóvel para ver o código
                  </p>
                </div>

                <input
                  type="text"
                  autoFocus
                  className="w-full p-4 border-2 border-blue-300 dark:border-blue-700 rounded-xl text-center text-3xl tracking-[0.5em] font-mono
                             bg-gray-50 dark:bg-gray-950
                             text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow
                             disabled:opacity-60"
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  maxLength={6}
                  disabled={loading}
                />

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setRequires2FA(false);
                      setTwoFactorCode("");
                      setError("");
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                    disabled={loading}
                  >
                    ← Voltar ao login
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg
                         hover:from-blue-700 hover:to-purple-700 transition-all
                         shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
                         disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  A processar...
                </span>
              ) : requires2FA ? (
                "Validar Código"
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {!requires2FA && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                    Ou continuar com
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} />
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Ainda não tens conta?{" "}
              <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                Criar conta
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-500 dark:text-gray-400">
          ATEC Management • Portal de Gestão v1.0
        </div>
      </div>
    </div>
  );
}