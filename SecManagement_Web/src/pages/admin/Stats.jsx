import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import BurgerMenu from "../../components/BurgerMenu";

function StatCard({ label, value, tone = "blue", icon }) {
  const tones = {
    blue: "from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10",
    purple: "from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10",
    green: "from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10",
    amber: "from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10",
  };

  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4">
      <div className={`absolute inset-0 bg-gradient-to-br ${tones[tone]} opacity-50`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
        </div>
        {icon ? (
          <div className="w-10 h-10 rounded-xl bg-white/70 dark:bg-gray-950/40 border border-white/30 dark:border-gray-800 flex items-center justify-center">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SegTabs({ value, onChange, left, right }) {
  const base = "px-4 py-2 text-sm font-semibold transition-colors border border-gray-200 dark:border-gray-700";
  const active = "bg-blue-600 text-white border-blue-600";
  const idle = "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800";

  return (
    <div className="inline-flex rounded-lg overflow-hidden">
      <button type="button" onClick={() => onChange(left.value)} className={[base, value === left.value ? active : idle].join(" ")}>
        {left.label}
      </button>
      <button type="button" onClick={() => onChange(right.value)} className={[base, value === right.value ? active : idle].join(" ")}>
        {right.label}
      </button>
    </div>
  );
}

function formatHours(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0 h";
  if (n < 1) return `${Math.round(n * 60)} min`;
  return `${n.toFixed(n >= 10 ? 0 : 1)} h`;
}

/* Formata data ISO para dd/mm/aaaa */
function formatDatePt(isoStr) {
  if (!isoStr) return "—";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function AdminStats() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("indicadores");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/Stats/dashboard");
      setData(res.data ?? null);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Falha ao carregar estatísticas.";
      setError(typeof msg === "string" ? msg : "Falha ao carregar estatísticas.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const cursosPorArea = useMemo(() => {
    const list = Array.isArray(data?.cursosPorArea) ? data.cursosPorArea : [];
    return [...list].sort((a, b) => (b.quantidade ?? 0) - (a.quantidade ?? 0));
  }, [data]);

  const topFormadores = useMemo(() => {
    const list = Array.isArray(data?.topFormadores) ? data.topFormadores : [];
    return [...list].sort((a, b) => (b.totalHoras ?? 0) - (a.totalHoras ?? 0));
  }, [data]);

  // Requisito 1.j – turmas a iniciar nos próximos 60 dias
  const cursosProximos = useMemo(() => {
    const list = Array.isArray(data?.cursosProximos60Dias) ? data.cursosProximos60Dias : [];
    return [...list].sort((a, b) => (a.diasRestantes ?? 0) - (b.diasRestantes ?? 0));
  }, [data]);

  const maxArea = useMemo(() => {
    if (!cursosPorArea.length) return 0;
    return Math.max(...cursosPorArea.map((x) => Number(x.quantidade) || 0));
  }, [cursosPorArea]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl dark:bg-gray-900/90 border-b dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BurgerMenu />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3a1 1 0 011 1v16a1 1 0 11-2 0V4a1 1 0 011-1zm8 6a1 1 0 011 1v10a1 1 0 11-2 0V10a1 1 0 011-1zM5 13a1 1 0 011 1v6a1 1 0 11-2 0v-6a1 1 0 011-1z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Estatísticas</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Indicadores globais do sistema e performance pedagógica
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <SegTabs
                value={tab}
                onChange={setTab}
                left={{ value: "indicadores", label: "Indicadores" }}
                right={{ value: "proximos", label: "Próximos Cursos" }}
              />
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold
                            hover:bg-gray-50 transition active:scale-95
                            dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                ← Voltar
              </button>

              <button
                onClick={load}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-medium
                           hover:from-indigo-700 hover:to-indigo-800 transition-all
                           shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40
                           active:scale-95"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</div>
          </div>
        )}

        {/* Top cards — agora 4 colunas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Cursos terminados"
            value={loading ? "—" : (data?.totalCursosTerminados ?? 0)}
            tone="purple"
            icon={
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Cursos a decorrer"
            value={loading ? "—" : (data?.totalCursosDecorrer ?? 0)}
            tone="blue"
            icon={
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="Formandos ativos"
            value={loading ? "—" : (data?.totalFormandosAtivos ?? 0)}
            tone="green"
            icon={
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1m-4 6H2v-2a4 4 0 014-4h1m6 6v-2a4 4 0 00-4-4H8m8-6a4 4 0 11-8 0 4 4 0 018 0zm6 2a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
          />
          {/* Requisito 1.j – card de contagem */}
          <StatCard
            label="A iniciar (60 dias)"
            value={loading ? "—" : cursosProximos.length}
            tone="amber"
            icon={
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
          />
        </div>

        {/* Separator */}
        <div className="my-6 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />

        {/* Loading */}
        {loading ? (
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm p-10">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-500 dark:text-gray-400">A carregar estatísticas...</span>
            </div>
          </div>
        ) : (
          <>
            {tab === "indicadores" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cursos por área */}
                <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b dark:border-gray-800 bg-gradient-to-r from-indigo-50/50 to-blue-50/50 dark:from-indigo-950/20 dark:to-blue-950/20">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-gray-900 dark:text-gray-100">Cursos por área</h2>
                      <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 px-2 py-1 rounded-lg">
                        {cursosPorArea.reduce((acc, x) => acc + (Number(x.quantidade) || 0), 0)} total
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Distribuição de cursos concluídos/terminados por área
                    </p>
                  </div>

                  <div className="p-6">
                    {cursosPorArea.length === 0 ? (
                      <div className="text-sm text-gray-500 dark:text-gray-400">Sem dados para apresentar.</div>
                    ) : (
                      <div className="space-y-4">
                        {cursosPorArea.map((row, idx) => {
                          const q = Number(row.quantidade) || 0;
                          const pct = maxArea > 0 ? Math.round((q / maxArea) * 100) : 0;

                          return (
                            <div key={`${row.area}-${idx}`} className="space-y-1">
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                                  {row.area || "—"}
                                </div>
                                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{q}</div>
                              </div>

                              <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border dark:border-gray-800">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700"
                                  style={{ width: `${pct}%` }}
                                  title={`${pct}%`}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Top formadores */}
                <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b dark:border-gray-800 bg-gradient-to-r from-emerald-50/50 to-teal-50/50 dark:from-emerald-950/20 dark:to-teal-950/20">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-gray-900 dark:text-gray-100">Top 10 formadores</h2>
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2 py-1 rounded-lg">
                        por horas lecionadas
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Ranking baseado nas horas registadas em sessões
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border-b dark:border-gray-700">
                        <tr>
                          <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-3 px-6 uppercase tracking-wider">
                            #
                          </th>
                          <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-3 px-6 uppercase tracking-wider">
                            Formador
                          </th>
                          <th className="text-right text-xs font-bold text-gray-700 dark:text-gray-200 py-3 px-6 uppercase tracking-wider">
                            Horas
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {topFormadores.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-10 px-6 text-sm text-gray-500 dark:text-gray-400">
                              Sem dados para apresentar.
                            </td>
                          </tr>
                        ) : (
                          topFormadores.slice(0, 10).map((row, idx) => (
                            <tr key={`${row.nome}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                              <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 font-semibold">
                                {idx + 1}
                              </td>
                              <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100 font-semibold">
                                {row.nome || "—"}
                              </td>
                              <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100 font-bold text-right">
                                {formatHours(row.totalHoras)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {topFormadores.length > 0 ? (
                    <div className="px-6 py-4 border-t dark:border-gray-800 text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">Top:</span>{" "}
                      {topFormadores[0]?.nome
                        ? `${topFormadores[0].nome} (${formatHours(topFormadores[0].totalHoras)})`
                        : "—"}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {tab === "proximos" && (
              <>
                {/* Requisito 1.j – Turmas a iniciar nos próximos 60 dias */}
                <div className="mt-6 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b dark:border-gray-800 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-gray-900 dark:text-gray-100">Cursos a iniciar nos próximos 60 dias</h2>
                      <span className="text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-2 py-1 rounded-lg">
                        {cursosProximos.length} turma{cursosProximos.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Turmas agendadas para começar entre hoje e os próximos 60 dias
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border-b dark:border-gray-700">
                        <tr>
                          <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-3 px-6 uppercase tracking-wider">
                            Turma
                          </th>
                          <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-3 px-6 uppercase tracking-wider">
                            Curso
                          </th>
                          <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-3 px-6 uppercase tracking-wider">
                            Área
                          </th>
                          <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-3 px-6 uppercase tracking-wider">
                            Data Início
                          </th>
                          <th className="text-right text-xs font-bold text-gray-700 dark:text-gray-200 py-3 px-6 uppercase tracking-wider">
                            Dias restantes
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {cursosProximos.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-10 px-6 text-sm text-gray-500 dark:text-gray-400">
                              Sem cursos a iniciar nos próximos 60 dias.
                            </td>
                          </tr>
                        ) : (
                          cursosProximos.map((row) => (
                            <tr key={row.turmaId} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                              <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100 font-semibold">
                                {row.turmaNome || "—"}
                              </td>
                              <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                                {row.cursoNome || "—"}
                              </td>
                              <td className="py-4 px-6">
                                <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
                                  {row.area || "—"}
                                </span>
                              </td>
                              <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                                {formatDatePt(row.dataInicio)}
                              </td>
                              <td className="py-4 px-6 text-right">
                                <span className={`text-sm font-bold ${(row.diasRestantes ?? 0) <= 7
                                  ? "text-red-600 dark:text-red-400"
                                  : (row.diasRestantes ?? 0) <= 30
                                    ? "text-amber-600 dark:text-amber-400"
                                    : "text-green-600 dark:text-green-400"
                                  }`}>
                                  {row.diasRestantes ?? 0} dia{(row.diasRestantes ?? 0) !== 1 ? "s" : ""}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
