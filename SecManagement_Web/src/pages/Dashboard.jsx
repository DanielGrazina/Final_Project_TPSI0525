import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import useTheme from "../hooks/useTheme";
import ThemeToggle from "../components/ThemeToggle";

// ✅ usa o helper do JWT (tens de ter este ficheiro criado)
import { getToken, getUserRoleFromToken } from "../utils/auth";

function NavCard({ title, desc, onClick, badge, disabled }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      className={`text-left border rounded-2xl p-5 transition shadow-sm
                  bg-white hover:bg-gray-50
                  dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800
                  ${disabled ? "opacity-60 cursor-not-allowed hover:bg-white dark:hover:bg-gray-900" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>

        {badge ? (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full border
                       text-gray-600 border-gray-200
                       dark:text-gray-300 dark:border-gray-700"
          >
            {badge}
          </span>
        ) : null}
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</div>

      <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-3">
        {disabled ? "Em breve" : "Abrir →"}
      </div>
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const token = getToken();

  useEffect(() => {
    if (!token) navigate("/", { replace: true });
  }, [navigate, token]);

  const role = useMemo(() => getUserRoleFromToken(token), [token]);

  // ✅ Permissões por role
  const perms = useMemo(() => {
    const isAdmin = role === "Admin";
    const isFormador = role === "Formador";
    const isFormando = role === "Formando";
    const isUser = role === "User";

    return {
      role,

      isAdmin,
      isFormador,
      isFormando,
      isUser,

      // Admin vê tudo
      canUsers: isAdmin,
      canAreas: isAdmin,
      canCourses: isAdmin,
      canModules: isAdmin,
      canTurmas: isAdmin,

      // Formador: salas + avaliações
      canRooms: isAdmin || isFormador,
      canEvaluations: isAdmin || isFormador || isFormando,

      // Por agora ainda não tens página de Inscrições, então fica "em breve"
      canInscricoes: isAdmin || isFormando || isUser,
    };
  }, [role]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  // ✅ Rotas que EXISTEM no teu projeto
  const R = {
    users: "/admin/Users",
    areas: "/admin/Areas",
    courses: "/admin/Courses",
    modules: "/admin/Modules",
    rooms: "/admin/Rooms",
    turmas: "/admin/Turmas",
    evaluations: "/admin/Evaluations",

    // Ainda não existe, por isso não vamos navegar (fica disabled)
    inscricoes: "/admin/Inscricoes",
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar */}
      <div className="bg-white border-b dark:bg-gray-900 dark:border-gray-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            className="font-bold text-blue-600 dark:text-blue-400 text-lg"
            onClick={() => navigate("/dashboard")}
          >
            ATEC Management
          </button>

          <div className="flex gap-2 items-center">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            <div
              className="text-xs px-2 py-1 rounded border
                         text-gray-700 dark:text-gray-200 dark:border-gray-700"
              title="Role do utilizador (lido do token JWT)"
            >
              Role: <span className="font-semibold">{perms.role}</span>
            </div>

            {/* Só Admin vê o botão de Utilizadores */}
            {perms.canUsers ? (
              <button
                type="button"
                onClick={() => navigate(R.users)}
                className="px-3 py-2 rounded border text-gray-700 hover:bg-gray-50
                           dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Utilizadores
              </button>
            ) : null}

            <button
              type="button"
              onClick={logout}
              className="px-3 py-2 rounded bg-red-500 text-white hover:bg-red-600"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Hero */}
        <div className="border rounded-2xl shadow-sm p-7 md:p-9 bg-white dark:bg-gray-900 dark:border-gray-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow">
                  AM
                </div>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Portal de Gestão
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Acesso controlado por permissões (Admin / Formador / Formando / User).
                  </p>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
                {perms.isAdmin && (
                  <>
                    Recomendo começares por <span className="font-semibold">Utilizadores</span> (roles/perfis),
                    depois cursos → módulos → turmas.
                  </>
                )}

                {perms.isFormador && (
                  <>
                    Tens acesso a <span className="font-semibold">Salas</span> e <span className="font-semibold">Avaliações</span>.
                  </>
                )}

                {perms.isFormando && (
                  <>
                    Tens acesso a <span className="font-semibold">Avaliações</span> (modo leitura) e, mais tarde, a <span className="font-semibold">Inscrições</span>.
                  </>
                )}

                {perms.isUser && (
                  <>
                    Por agora tens acesso previsto a <span className="font-semibold">Inscrições</span> (quando a página existir).
                  </>
                )}
              </div>

              {/* Botões principais — só mostra os que fazem sentido */}
              <div className="mt-5 flex flex-wrap gap-2">
                {perms.canUsers ? (
                  <button
                    type="button"
                    onClick={() => navigate(R.users)}
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Ir para Utilizadores
                  </button>
                ) : null}

                {perms.canCourses ? (
                  <button
                    type="button"
                    onClick={() => navigate(R.courses)}
                    className="px-4 py-2 rounded border hover:bg-gray-50
                               dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    Ver Cursos
                  </button>
                ) : null}

                {!perms.canUsers && perms.canRooms ? (
                  <button
                    type="button"
                    onClick={() => navigate(R.rooms)}
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Ir para Salas
                  </button>
                ) : null}

                {!perms.canUsers && !perms.canRooms && perms.canEvaluations ? (
                  <button
                    type="button"
                    onClick={() => navigate(R.evaluations)}
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Ir para Avaliações
                  </button>
                ) : null}
              </div>
            </div>

            {/* Atalhos — só aparecem se o role tiver acesso */}
            <div className="grid grid-cols-2 gap-3 min-w-[220px]">
              {perms.canUsers ? (
                <button
                  type="button"
                  onClick={() => navigate(R.users)}
                  className="border rounded-xl p-3 bg-gray-50 hover:bg-gray-100 transition
                             dark:bg-gray-950 dark:border-gray-800 dark:hover:bg-gray-900"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">Atalho</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Utilizadores</div>
                </button>
              ) : (
                <div className="border rounded-xl p-3 opacity-60 bg-gray-50 dark:bg-gray-950 dark:border-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Atalho</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Utilizadores</div>
                </div>
              )}

              {perms.canTurmas ? (
                <button
                  type="button"
                  onClick={() => navigate(R.turmas)}
                  className="border rounded-xl p-3 bg-gray-50 hover:bg-gray-100 transition
                             dark:bg-gray-950 dark:border-gray-800 dark:hover:bg-gray-900"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">Atalho</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Turmas</div>
                </button>
              ) : (
                <div className="border rounded-xl p-3 opacity-60 bg-gray-50 dark:bg-gray-950 dark:border-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Atalho</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Turmas</div>
                </div>
              )}

              {perms.canRooms ? (
                <button
                  type="button"
                  onClick={() => navigate(R.rooms)}
                  className="border rounded-xl p-3 bg-gray-50 hover:bg-gray-100 transition
                             dark:bg-gray-950 dark:border-gray-800 dark:hover:bg-gray-900"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">Atalho</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Salas</div>
                </button>
              ) : (
                <div className="border rounded-xl p-3 opacity-60 bg-gray-50 dark:bg-gray-950 dark:border-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Atalho</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Salas</div>
                </div>
              )}

              {perms.canModules ? (
                <button
                  type="button"
                  onClick={() => navigate(R.modules)}
                  className="border rounded-xl p-3 bg-gray-50 hover:bg-gray-100 transition
                             dark:bg-gray-950 dark:border-gray-800 dark:hover:bg-gray-900"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">Atalho</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Módulos</div>
                </button>
              ) : (
                <div className="border rounded-xl p-3 opacity-60 bg-gray-50 dark:bg-gray-950 dark:border-gray-800">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Atalho</div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Módulos</div>
                </div>
              )}
            </div>
          </div>

          {/* Cards — só aparecem se tiver permissão */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {perms.canUsers && (
              <NavCard
                title="Utilizadores"
                desc="Criar users, atribuir Role, ativar/desativar."
                onClick={() => navigate(R.users)}
                badge="Admin"
              />
            )}

            {perms.canAreas && (
              <NavCard title="Áreas" desc="Gestão de áreas de formação (CRUD)." onClick={() => navigate(R.areas)} />
            )}

            {perms.canCourses && (
              <NavCard title="Cursos" desc="Criar cursos e associar a áreas (CRUD)." onClick={() => navigate(R.courses)} />
            )}

            {perms.canModules && (
              <NavCard title="Módulos" desc="Catálogo de módulos (CRUD)." onClick={() => navigate(R.modules)} />
            )}

            {perms.canTurmas && (
              <NavCard title="Turmas" desc="Gestão de turmas e estado (CRUD)." onClick={() => navigate(R.turmas)} />
            )}

            {perms.canRooms && (
              <NavCard title="Salas" desc="Gestão de salas e capacidade." onClick={() => navigate(R.rooms)} badge={perms.isFormador ? "Formador" : "Admin"} />
            )}

            {perms.canEvaluations && (
              <NavCard
                title="Avaliações"
                desc={perms.isFormando ? "Ver avaliações (read-only)." : "Registo/edição de avaliações."}
                onClick={() => navigate(R.evaluations)}
                badge={perms.isFormando ? "Leitura" : "OK"}
              />
            )}

            {/* Inscrições ainda não existe -> aparece mas disabled se tiver permissão prevista */}
            {perms.canInscricoes && (
              <NavCard
                title="Inscrições"
                desc="Matrículas/inscrições (a página ainda não está feita)."
                disabled
                badge="Em breve"
              />
            )}

            {/* Sessões ainda não está na tua lista de rotas -> mantém como disabled */}
            <NavCard title="Sessões" desc="Planeamento de sessões/aulas (quando estiver pronta)." disabled />
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
          ATEC Management • Manager App
        </div>
      </div>
    </div>
  );
}
