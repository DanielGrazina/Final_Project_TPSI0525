// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useTheme from "../hooks/useTheme";
import ThemeToggle from "../components/ThemeToggle";
import { getToken, getUserRoleFromToken } from "../utils/auth";
import TawkToWidget from "../components/TawkToWidget";
import { QRCodeCanvas } from "qrcode.react";
import api from "../api/axios";

function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200",
    blue: "border-blue-200 text-blue-700 dark:border-blue-900 dark:text-blue-200",
    green: "border-green-200 text-green-700 dark:border-green-900 dark:text-green-200",
    amber: "border-amber-200 text-amber-800 dark:border-amber-900 dark:text-amber-200",
    red: "border-red-200 text-red-700 dark:border-red-900 dark:text-red-200",
    purple: "border-purple-200 text-purple-700 dark:border-purple-900 dark:text-purple-200",
  };

  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Icon({ name }) {
  const common = "w-5 h-5";
  switch (name) {
    case "users":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Z" stroke="currentColor" strokeWidth="2" />
          <path
            d="M4 20c1.5-3 4.2-5 8-5s6.5 2 8 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    case "profile":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M20 21a8 8 0 0 0-16 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
      );
    case "areas":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "courses":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M4 5h14a2 2 0 0 1 2 2v12H6a2 2 0 0 0-2 2V5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M6 17h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "modules":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M7 3h10v6H7V3Z" stroke="currentColor" strokeWidth="2" />
          <path d="M5 11h14v10H5V11Z" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "turmas":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M3 20h18M6 20V9l6-4 6 4v11" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M10 20v-6h4v6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      );
    case "rooms":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M4 20V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12" stroke="currentColor" strokeWidth="2" />
          <path d="M9 20v-5h6v5" stroke="currentColor" strokeWidth="2" />
          <path d="M8 10h1M11.5 10h1M15 10h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "eval":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M7 3h10v4H7V3Z" stroke="currentColor" strokeWidth="2" />
          <path d="M7 7h10v14H7V7Z" stroke="currentColor" strokeWidth="2" />
          <path d="M9 11h6M9 15h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "inscr":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path d="M7 3h10v18H7V3Z" stroke="currentColor" strokeWidth="2" />
          <path d="M9 8h6M9 12h6M9 16h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none">
          <path
            d="M7 3v2M17 3v2M4 8h16M6 5h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M7 12h5M7 16h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

function NavCard({ title, desc, onClick, badge, disabled, icon, accent = "blue" }) {
  const accents = {
    blue: {
      bg: "from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10",
      icon: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    },
    green: {
      bg: "from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10",
      icon: "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400",
    },
    amber: {
      bg: "from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10",
      icon: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400",
    },
    purple: {
      bg: "from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10",
      icon: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    },
  };

  const colors = accents[accent] || accents.blue;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      className={[
        "group relative overflow-hidden text-left border rounded-xl p-5 transition-all duration-300",
        "bg-white dark:bg-gray-900 dark:border-gray-800",
        disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
      ].join(" ")}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${colors.icon} transition-transform duration-300 group-hover:scale-110`}
          >
            <Icon name={icon} />
          </div>

          {badge ? <Badge tone={badge.tone}>{badge.text}</Badge> : <Badge tone="neutral">Disponível</Badge>}
        </div>

        <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1.5">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {disabled ? "Indisponível" : "Clique para abrir"}
          </span>
          <span
            className={[
              "text-sm font-semibold",
              disabled
                ? "text-gray-400 dark:text-gray-600"
                : "text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform",
            ].join(" ")}
          >
            {disabled ? "—" : "→"}
          </span>
        </div>
      </div>
    </button>
  );
}

function RolePill({ role }) {
  const map = {
    SuperAdmin: { tone: "purple", label: "SuperAdmin" },
    Admin: { tone: "green", label: "Admin" },
    Secretaria: { tone: "blue", label: "Secretaria" },
    Formador: { tone: "blue", label: "Formador" },
    Formando: { tone: "amber", label: "Formando" },
    User: { tone: "neutral", label: "User" },
  };
  const r = map[role] || { tone: "neutral", label: role || "—" };
  return <Badge tone={r.tone}>{r.label}</Badge>;
}

function QuickAccessCard({ title, count, enabled, onClick, color = "blue" }) {
  const colors = {
    blue: {
      bg: "from-blue-500 to-blue-600",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800",
    },
    green: {
      bg: "from-green-500 to-green-600",
      text: "text-green-600 dark:text-green-400",
      border: "border-green-200 dark:border-green-800",
    },
    amber: {
      bg: "from-amber-500 to-amber-600",
      text: "text-amber-600 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800",
    },
    purple: {
      bg: "from-purple-500 to-purple-600",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800",
    },
  };

  const c = colors[color] || colors.blue;

  return enabled ? (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden border rounded-xl p-5 text-left
                  bg-white dark:bg-gray-900 ${c.border}
                  hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95`}
    >
      <div
        className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${c.bg} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`}
      />
      <div className="relative">
        <div className={`text-xs font-medium ${c.text} mb-1`}>Acesso rápido</div>
        <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</div>
        <div className="text-2xl font-black text-gray-400 dark:text-gray-600">{count}</div>
        <div className={`mt-3 text-xs font-semibold ${c.text} group-hover:translate-x-1 transition-transform inline-block`}>
          Ver mais →
        </div>
      </div>
    </button>
  ) : (
    <div className={`border rounded-xl p-5 text-left opacity-40 bg-gray-50 dark:bg-gray-900 ${c.border}`}>
      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sem acesso</div>
      <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">{title}</div>
      <div className="text-2xl font-black text-gray-400 dark:text-gray-600">—</div>
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">Bloqueado</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const token = getToken();

  // --- 2FA ---
  const [twoFaUrl, setTwoFaUrl] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [twoFaError, setTwoFaError] = useState("");

  useEffect(() => {
    if (!token) navigate("/", { replace: true });
  }, [navigate, token]);

  const role = useMemo(() => getUserRoleFromToken(token), [token]);

  // ✅ Rotas alinhadas com o App.jsx + adiciona Profiles
  const R = {
    users: "/admin/users",
    areas: "/admin/areas",
    courses: "/admin/courses",
    modules: "/admin/modules",
    rooms: "/admin/rooms",
    turmas: "/admin/turmas",
    evaluations: "/admin/evaluations",
    sessoes: "/admin/sessions",
    recruit: "/recruit",
    profiles: "/profiles",
  };

  // ✅ Permissões alinhadas com o backend
  const perms = useMemo(() => {
    const isSuperAdmin = role === "SuperAdmin";
    const isAdmin = role === "Admin";
    const isSecretaria = role === "Secretaria";
    const isFormador = role === "Formador";
    const isFormando = role === "Formando";
    const isUser = role === "User";

    const adminish = isAdmin || isSuperAdmin;

    return {
      role,
      isSuperAdmin,
      isAdmin,
      isSecretaria,
      isFormador,
      isFormando,
      isUser,

      canUsers: adminish || isSecretaria,

      canAreas: adminish,
      canCourses: adminish,
      canModules: adminish,
      canTurmas: adminish,

      canRooms: adminish,

      canSessoes: adminish || isFormador,

      canEvaluations: adminish || isFormador || isFormando,

      canInscricoes: isUser || isFormando || isSecretaria || adminish,

      // Profiles: está aberto a qualquer user logado (como no App.jsx)
      canProfiles: true,
    };
  }, [role]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  const primaryActions = useMemo(() => {
    if (perms.isSuperAdmin || perms.isAdmin) {
      return [
        { label: "Utilizadores", go: R.users },
        { label: "Cursos", go: R.courses },
        { label: "Turmas", go: R.turmas },
        { label: "Profiles", go: R.profiles },
      ];
    }
    if (perms.isSecretaria) {
      return [
        { label: "Utilizadores", go: R.users },
        { label: "Inscrições", go: R.recruit },
        { label: "Profiles", go: R.profiles },
      ];
    }
    if (perms.isFormador) {
      return [
        { label: "Sessões", go: R.sessoes },
        { label: "Avaliações", go: R.evaluations },
        { label: "Profile", go: R.profiles },
      ];
    }
    if (perms.isFormando) {
      return [
        { label: "Avaliações", go: R.evaluations },
        { label: "Inscrições", go: R.recruit },
        { label: "Profile", go: R.profiles },
      ];
    }
    return [
      { label: "Inscrições", go: R.recruit },
      { label: "Profile", go: R.profiles },
    ];
  }, [perms, R]);

  const summaryText = useMemo(() => {
    if (perms.isSuperAdmin) return "Acesso total ao sistema. Tudo disponível.";
    if (perms.isAdmin) return "Controlo do sistema: utilizadores, cursos, módulos, turmas e salas.";
    if (perms.isSecretaria) return "Gestão operacional: utilizadores, inscrições e perfis (dados e ficheiros).";
    if (perms.isFormador) return "Consulta o teu profile e gere as tuas sessões e avaliações.";
    if (perms.isFormando) return "Consulta o teu profile, as tuas avaliações e acompanha as tuas inscrições.";
    return "Faz a tua candidatura e acompanha o estado.";
  }, [perms]);

  const enable2FA = async () => {
    try {
      setTwoFaError("");
      setTwoFaLoading(true);

      // ⚠️ depende do teu AuthController:
      // espera-se { qrCodeUrl: "otpauth://..." }
      const res = await api.post("/Auth/enable-2fa");
      if (!res?.data?.qrCodeUrl) throw new Error("Resposta inválida: qrCodeUrl em falta.");

      setTwoFaUrl(res.data.qrCodeUrl);
    } catch (e) {
      setTwoFaUrl("");
      const msg = e?.response?.data?.message || e?.message || "Erro inesperado.";
      setTwoFaError(msg);
    } finally {
      setTwoFaLoading(false);
    }
  };

  return (
    <>
      <TawkToWidget />

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        {/* Header / Top bar */}
        <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur-xl dark:bg-gray-900/90 dark:border-gray-800 shadow-sm">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <button type="button" className="flex items-center gap-3 group" onClick={() => navigate("/dashboard")}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center text-base font-bold shadow-lg shadow-blue-500/30 group-hover:shadow-blue-500/50 transition-shadow">
                AM
              </div>
              <div className="leading-tight text-left">
                <div className="font-bold text-gray-900 dark:text-gray-100">ATEC Management</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Portal de Gestão</div>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <ThemeToggle theme={theme} onToggle={toggleTheme} />

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">Perfil</span>
                <RolePill role={perms.role} />
              </div>

              {perms.canProfiles && (
                <button
                  type="button"
                  onClick={() => navigate(R.profiles)}
                  className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-100 transition
                             dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Profiles
                </button>
              )}

              {perms.canUsers && (
                <button
                  type="button"
                  onClick={() => navigate(R.users)}
                  className="px-3 py-2 rounded-lg border text-gray-700 hover:bg-gray-100 transition
                             dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  Utilizadores
                </button>
              )}

              <button
                type="button"
                onClick={logout}
                className="px-3 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 transition shadow-sm hover:shadow-md"
              >
                Sair
              </button>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="container mx-auto px-4 py-8">
          <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-blue-950/20 dark:to-purple-950/20 dark:border-gray-800 shadow-xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />

            <div
              className="absolute inset-0 opacity-30 dark:opacity-10"
              style={{
                backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                color: "rgb(59, 130, 246)",
              }}
            />

            <div className="relative p-8 md:p-12">
              <div className="flex items-center gap-3 mb-4">
                <RolePill role={perms.role} />
                <div className="h-1 w-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Acesso baseado em permissões</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-gray-100 mb-3 leading-tight">
                Bem-vindo de volta
              </h1>

              <p className="text-base text-gray-600 dark:text-gray-400 max-w-2xl mb-6">{summaryText}</p>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                {primaryActions.map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    onClick={() => navigate(a.go)}
                    className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium
                               hover:from-blue-700 hover:to-blue-800 transition-all duration-200
                               shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
                               active:scale-95"
                  >
                    {a.label}
                  </button>
                ))}
              </div>

              <div className="mt-6 inline-flex items-start gap-2 px-4 py-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 11v5m0-9v.01" />
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                </svg>
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>Dica:</strong> Se uma área não aparecer, é porque o teu perfil não tem permissão (ou o backend bloqueou).
                </p>
              </div>
            </div>
          </div>

          {/* ✅ 2FA (QR Code) */}
          <div className="mt-8">
            <div className="border rounded-2xl bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">2FA</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Gera o QR code para configurar autenticação de dois fatores na tua conta.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={enable2FA}
                  disabled={twoFaLoading}
                  className={[
                    "px-4 py-2 rounded-lg font-medium text-white transition shadow-sm",
                    twoFaLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700",
                  ].join(" ")}
                >
                  {twoFaLoading ? "A gerar..." : twoFaUrl ? "Mostrar novamente" : "Gerar QR Code"}
                </button>
              </div>

              {twoFaError && <div className="mt-4 text-sm text-red-600 dark:text-red-400">{twoFaError}</div>}

              {twoFaUrl && (
                <div className="mt-5 flex flex-col md:flex-row items-start gap-6">
                  <div className="p-4 rounded-xl border bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                    <QRCodeCanvas value={twoFaUrl} size={180} includeMargin />
                  </div>

                  <div className="flex-1">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      1) Abre o Google Authenticator / Microsoft Authenticator<br />
                      2) Lê o QR code<br />
                      3) Guarda o backup abaixo (opcional)
                    </div>

                    <div className="mt-3">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Backup (otpauth URL)</div>
                      <div className="text-xs break-all rounded-lg border p-3 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-gray-700 dark:text-gray-200">
                        {twoFaUrl}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Access Cards */}
          <div className="mt-8 grid grid-cols-2 lg:grid-cols-5 gap-4">
            <QuickAccessCard
              title="Sessões"
              count="—"
              enabled={perms.canSessoes}
              onClick={() => navigate(R.sessoes)}
              color="green"
            />
            <QuickAccessCard
              title="Avaliações"
              count="—"
              enabled={perms.canEvaluations}
              onClick={() => navigate(R.evaluations)}
              color="purple"
            />
            <QuickAccessCard
              title="Inscrições"
              count="—"
              enabled={perms.canInscricoes}
              onClick={() => navigate(R.recruit)}
              color="blue"
            />
            <QuickAccessCard
              title="Salas"
              count="—"
              enabled={perms.canRooms}
              onClick={() => navigate(R.rooms)}
              color="amber"
            />
            <QuickAccessCard
              title="Profiles"
              count="—"
              enabled={perms.canProfiles}
              onClick={() => navigate(R.profiles)}
              color="blue"
            />
          </div>

          {/* Main Navigation Cards */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Navegação Principal</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {perms.canUsers && (
                <NavCard
                  title="Utilizadores"
                  desc="Ver e gerir utilizadores e permissões (Admin/Secretaria/SuperAdmin)."
                  onClick={() => navigate(R.users)}
                  icon="users"
                  accent="green"
                  badge={{ text: perms.isSecretaria ? "Secretaria" : "Admin", tone: perms.isSecretaria ? "blue" : "green" }}
                />
              )}

              {perms.canProfiles && (
                <NavCard
                  title="Profiles"
                  desc={
                    perms.isAdmin || perms.isSuperAdmin || perms.isSecretaria
                      ? "Ver perfis, editar dados pessoais e gerir ficheiros (upload/download)."
                      : "Ver o teu profile e os teus dados."
                  }
                  onClick={() => navigate(R.profiles)}
                  icon="profile"
                  accent="blue"
                  badge={{
                    text: perms.isAdmin || perms.isSuperAdmin ? "Admin" : perms.isSecretaria ? "Secretaria" : "Consulta",
                    tone: perms.isAdmin || perms.isSuperAdmin ? "green" : perms.isSecretaria ? "blue" : "amber",
                  }}
                />
              )}

              {perms.canAreas && (
                <NavCard
                  title="Áreas"
                  desc="Gestão de áreas de formação: criar, editar e eliminar."
                  onClick={() => navigate(R.areas)}
                  icon="areas"
                  accent="blue"
                  badge={{ text: "Admin", tone: "green" }}
                />
              )}

              {perms.canCourses && (
                <NavCard
                  title="Cursos"
                  desc="Criar e gerir cursos, associando-os às respetivas áreas de formação."
                  onClick={() => navigate(R.courses)}
                  icon="courses"
                  accent="purple"
                  badge={{ text: "Admin", tone: "green" }}
                />
              )}

              {perms.canModules && (
                <NavCard
                  title="Módulos"
                  desc="Catálogo de módulos formativos disponíveis no sistema."
                  onClick={() => navigate(R.modules)}
                  icon="modules"
                  accent="blue"
                  badge={{ text: "Admin", tone: "green" }}
                />
              )}

              {perms.canTurmas && (
                <NavCard
                  title="Turmas"
                  desc="Gestão de turmas: criar, gerir estado e módulos associados."
                  onClick={() => navigate(R.turmas)}
                  icon="turmas"
                  accent="amber"
                  badge={{ text: "Admin", tone: "green" }}
                />
              )}

              {perms.canSessoes && (
                <NavCard
                  title="Sessões"
                  desc="Agendar sessões e consultar horários por turma/formador/sala."
                  onClick={() => navigate(R.sessoes)}
                  icon="calendar"
                  accent="green"
                  badge={{
                    text: perms.isFormador ? "Formador" : "Admin",
                    tone: perms.isFormador ? "blue" : "green",
                  }}
                />
              )}

              {perms.canRooms && (
                <NavCard
                  title="Salas"
                  desc="Gestão de salas (Admin/SuperAdmin)."
                  onClick={() => navigate(R.rooms)}
                  icon="rooms"
                  accent="blue"
                  badge={{ text: "Admin", tone: "green" }}
                />
              )}

              {perms.canEvaluations && (
                <NavCard
                  title="Avaliações"
                  desc={perms.isFormando ? "Consulta as tuas avaliações e resultados obtidos." : "Registo e gestão de avaliações."}
                  onClick={() => navigate(R.evaluations)}
                  icon="eval"
                  accent="purple"
                  badge={{
                    text: perms.isFormando ? "Consulta" : "Gestão",
                    tone: perms.isFormando ? "amber" : "green",
                  }}
                />
              )}

              {perms.canInscricoes && (
                <NavCard
                  title="Inscrições"
                  desc={
                    perms.isSecretaria || perms.isAdmin || perms.isSuperAdmin
                      ? "Gerir candidaturas pendentes, aprovar/rejeitar e colocar em turma."
                      : "Criar candidatura e acompanhar o estado."
                  }
                  onClick={() => navigate(R.recruit)}
                  icon="inscr"
                  accent="blue"
                  badge={{
                    text:
                      perms.isAdmin || perms.isSuperAdmin
                        ? "Admin"
                        : perms.isSecretaria
                        ? "Secretaria"
                        : perms.isFormando
                        ? "Formando"
                        : "User",
                    tone:
                      perms.isAdmin || perms.isSuperAdmin
                        ? "green"
                        : perms.isSecretaria
                        ? "blue"
                        : perms.isFormando
                        ? "amber"
                        : "neutral",
                  }}
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-12 pb-8">
            <div className="flex items-center justify-center gap-2">
              <span>ATEC Management</span>
              <div className="w-1 h-1 rounded-full bg-gray-400" />
              <span>Portal de Gestão v1.0</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
