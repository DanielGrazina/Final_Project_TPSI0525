import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useTheme from "../hooks/useTheme";
import ThemeToggle from "../components/ThemeToggle";

function NavCard({ title, desc, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left border rounded-xl p-5 transition shadow-sm
                 bg-white hover:bg-gray-50
                 dark:bg-gray-900 dark:border-gray-800 dark:hover:bg-gray-800"
    >
      <div className="font-semibold text-gray-900 dark:text-gray-100">{title}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</div>
      <div className="text-sm font-medium text-blue-600 dark:text-blue-400 mt-3">
        Abrir →
      </div>
    </button>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/", { replace: true });
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top bar minimal */}
      <div className="bg-white border-b dark:bg-gray-900 dark:border-gray-800">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button
            className="font-bold text-blue-600 dark:text-blue-400 text-lg"
            onClick={() => navigate("/dashboard")}
          >
            ATEC Management
          </button>

          <div className="flex gap-2 items-center">
            <ThemeToggle theme={theme} onToggle={toggleTheme} />

            <button
              onClick={() => navigate("/admin/users")}
              className="px-3 py-2 rounded border text-gray-700 hover:bg-gray-50
                         dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Utilizadores
            </button>

            <button
              onClick={logout}
              className="px-3 py-2 rounded bg-red-500 text-white hover:bg-red-600"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="container mx-auto px-4 py-10">
        <div className="border rounded-2xl shadow-sm p-8 md:p-10
                        bg-white dark:bg-gray-900 dark:border-gray-800">
          <div className="flex flex-col items-center text-center">
            {/* LOGO placeholder */}
            <div className="w-20 h-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold shadow">
              AM
            </div>

            <h1 className="mt-4 text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
              Portal de Gestão
            </h1>

            <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
              Acede rapidamente às áreas principais: cursos, módulos, turmas, sessões, salas,
              formadores e formandos. Estrutura preparada para CRUD e anexos.
            </p>

            <div className="mt-5 flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => navigate("/admin/cursos")}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Começar por Cursos
              </button>

              <button
                onClick={() => navigate("/admin/modulos")}
                className="px-4 py-2 rounded border hover:bg-gray-50
                           dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Ver Módulos
              </button>
            </div>
          </div>

          {/* Quick links */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <NavCard title="Cursos" desc="Criar/editar cursos e gerir distribuição de módulos." onClick={() => navigate("/admin/Courses")} />
            <NavCard title="Módulos" desc="Catálogo de módulos (CRUD)." onClick={() => navigate("/admin/Modules")} />
            <NavCard title="Turmas" desc="Gestão de turmas (CRUD)." onClick={() => navigate("/admin/Turmas")} />

            <NavCard title="Sessões" desc="Planeamento de aulas/sessões (CRUD)." onClick={() => navigate("/admin/sessoes")} />
            <NavCard title="Salas" desc="Gestão de salas e recursos (CRUD)." onClick={() => navigate("/admin/Rooms")} />
            <NavCard title="Areas" desc="Gestão de mapeamentos/alias (CRUD)." onClick={() => navigate("/admin/Areas")} />

            <NavCard title="Formadores" desc="Registo de formadores e anexos (em breve)." onClick={() => navigate("/admin/formadores")} />
            <NavCard title="Formandos" desc="Registo de formandos e anexos (em breve)." onClick={() => navigate("/admin/formandos")} />
            <NavCard title="Inscrições" desc="Matrículas de formandos em cursos/turmas (mais tarde)." onClick={() => navigate("/admin/inscricoes")} />
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
          ATEC Management • Manager App
        </div>
      </div>
    </div>
  );
}
