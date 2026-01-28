// src/pages/admin/Sessions.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

function Modal({ title, children, onClose, disableClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !disableClose && onClose()}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            disabled={disableClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                       hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 font-medium text-sm"
          >
            Fechar
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function toDateInputValue(dateLike) {
  if (!dateLike) return "";
  return String(dateLike).slice(0, 10);
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Converte Date -> "YYYY-MM-DD" (bom para query param DateTime no ASP.NET)
function toYmd(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

// Converte "YYYY-MM-DDTHH:mm" (datetime-local) -> ISO string com timezone local consistente
// (ASP.NET aceita ISO, e aqui não forçamos UTC para não "mexer" na hora)
function toIsoFromLocalDateTime(localDateTime) {
  if (!localDateTime) return null;
  const dt = new Date(localDateTime);
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toISOString();
}

function extractError(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;

  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;

  if (data?.errors && typeof data.errors === "object") {
    const k = Object.keys(data.errors)[0];
    const arr = data.errors[k];
    if (Array.isArray(arr) && arr.length) return arr[0];
    return "Dados inválidos.";
  }

  try {
    return JSON.stringify(data);
  } catch {
    return fallback;
  }
}

// Helpers de normalização (porque o backend pode devolver camelCase ou PascalCase)
function pick(obj, pascal, camel) {
  if (!obj) return undefined;
  if (obj[pascal] !== undefined) return obj[pascal];
  if (obj[camel] !== undefined) return obj[camel];
  return undefined;
}

function normalizeSessao(raw) {
  const id = pick(raw, "Id", "id");
  const turmaNome = pick(raw, "TurmaNome", "turmaNome") ?? "";
  const salaNome = pick(raw, "SalaNome", "salaNome") ?? "";
  const moduloNome = pick(raw, "ModuloNome", "moduloNome") ?? "";
  const formadorNome = pick(raw, "FormadorNome", "formadorNome") ?? "";
  const inicio = pick(raw, "HorarioInicio", "horarioInicio");
  const fim = pick(raw, "HorarioFim", "horarioFim");
  const salaId = pick(raw, "SalaId", "salaId");
  const turmaModuloId = pick(raw, "TurmaModuloId", "turmaModuloId");

  return {
    id,
    turmaNome,
    salaNome,
    moduloNome,
    formadorNome,
    horarioInicio: inicio,
    horarioFim: fim,
    salaId,
    turmaModuloId,
  };
}

async function tryGetFirst(paths, config) {
  let lastErr = null;
  for (const p of paths) {
    try {
      const res = await api.get(p, config);
      return res;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export default function AdminSessions() {
  const navigate = useNavigate();

  const [sessoes, setSessoes] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [turmaModulos, setTurmaModulos] = useState([]);

  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingSessoes, setLoadingSessoes] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  // modo de consulta do horário (porque não existe GET all)
  const [mode, setMode] = useState("turma"); // "turma" | "sala" | "formador"
  const [targetId, setTargetId] = useState("");

  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return toYmd(d);
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return toYmd(d);
  });

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    turmaModuloId: "",
    salaId: "",
    horarioInicio: "",
    horarioFim: "",
  });

  async function loadBaseData() {
    setLoadingBase(true);
    setError("");

    try {
      const [turmasRes, salasRes, tmRes] = await Promise.all([
        api.get("/Turmas"),
        api.get("/Salas"),
        // tenta endpoints possíveis (ajusta ao teu projeto sem rebentar)
        (async () => {
          try {
            return await tryGetFirst(["/TurmaModulos", "/Turmas/modulos"], {});
          } catch (e) {
            // se não existir, devolve vazio sem rebentar a página
            return { data: [] };
          }
        })(),
      ]);

      setTurmas(Array.isArray(turmasRes.data) ? turmasRes.data : []);
      setSalas(Array.isArray(salasRes.data) ? salasRes.data : []);

      const tm = Array.isArray(tmRes.data) ? tmRes.data : [];
      setTurmaModulos(tm);
    } catch (err) {
      setError(extractError(err, "Erro ao carregar dados base."));
    } finally {
      setLoadingBase(false);
    }
  }

  useEffect(() => {
    loadBaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSessoes() {
    setError("");

    const idNum = Number(targetId);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      setSessoes([]);
      return;
    }

    if (!startDate || !endDate) {
      setError("Seleciona datas de início e fim.");
      setSessoes([]);
      return;
    }

    setLoadingSessoes(true);
    try {
      const path =
        mode === "turma"
          ? `/Sessoes/turma/${idNum}`
          : mode === "sala"
          ? `/Sessoes/sala/${idNum}`
          : `/Sessoes/formador/${idNum}`;

      const res = await api.get(path, {
        params: { start: startDate, end: endDate },
      });

      const arr = Array.isArray(res.data) ? res.data : [];
      setSessoes(arr.map(normalizeSessao));
    } catch (err) {
      setSessoes([]);
      setError(extractError(err, "Erro ao carregar dados."));
    } finally {
      setLoadingSessoes(false);
    }
  }

  // Recarrega quando mudas critérios
  useEffect(() => {
    loadSessoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, targetId, startDate, endDate]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return sessoes;

    return sessoes.filter((x) => {
      const id = String(x.id ?? "");
      const t = (x.turmaNome ?? "").toLowerCase();
      const sala = (x.salaNome ?? "").toLowerCase();
      const mod = (x.moduloNome ?? "").toLowerCase();
      const formador = (x.formadorNome ?? "").toLowerCase();
      return id.includes(s) || t.includes(s) || sala.includes(s) || mod.includes(s) || formador.includes(s);
    });
  }, [sessoes, search]);

  function openCreate() {
    setForm({
      turmaModuloId: "",
      salaId: "",
      horarioInicio: "",
      horarioFim: "",
    });
    setError("");
    setShowForm(true);
  }

  function closeForm(force = false) {
    if (!force && saving) return;
    setShowForm(false);
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function saveSessao(e) {
    e.preventDefault();
    setError("");

    const turmaModuloId = Number(form.turmaModuloId);
    const salaId = Number(form.salaId);

    if (!Number.isFinite(turmaModuloId) || turmaModuloId <= 0) return alert("Seleciona um Módulo da Turma.");
    if (!Number.isFinite(salaId) || salaId <= 0) return alert("Seleciona uma Sala.");
    if (!form.horarioInicio) return alert("Horário de início é obrigatório.");
    if (!form.horarioFim) return alert("Horário de fim é obrigatório.");

    const horarioInicioIso = toIsoFromLocalDateTime(form.horarioInicio);
    const horarioFimIso = toIsoFromLocalDateTime(form.horarioFim);

    if (!horarioInicioIso || !horarioFimIso) return alert("Datas/horas inválidas.");
    if (new Date(horarioFimIso) <= new Date(horarioInicioIso)) {
      return alert("A hora de fim tem de ser superior à de início.");
    }

    // O teu backend espera CreateSessaoDto com estes nomes (mas JSON pode estar em camelCase também)
    // Para evitar falhas por casing, mando as duas versões (ASP.NET ignora o que não precisa).
    const payload = {
      TurmaModuloId: turmaModuloId,
      SalaId: salaId,
      HorarioInicio: horarioInicioIso,
      HorarioFim: horarioFimIso,

      turmaModuloId: turmaModuloId,
      salaId: salaId,
      horarioInicio: horarioInicioIso,
      horarioFim: horarioFimIso,
    };

    setSaving(true);
    try {
      await api.post("/Sessoes", payload);
      closeForm(true);
      // Recarrega listagem atual
      await loadSessoes();
    } catch (err) {
      console.log("POST /Sessoes FAIL", {
        status: err.response?.status,
        data: err.response?.data,
        payloadSent: payload,
      });
      setError(extractError(err, "Erro ao guardar sessão."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSessao(id) {
    if (!window.confirm("Tens a certeza que queres apagar esta sessão?")) return;

    setError("");
    try {
      await api.delete(`/Sessoes/${id}`);
      setSessoes((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(extractError(err, "Erro ao apagar sessão."));
    }
  }

  function formatDateTime(dtLike) {
    if (!dtLike) return "—";
    const d = new Date(dtLike);
    if (Number.isNaN(d.getTime())) return String(dtLike);
    const date = d.toLocaleDateString("pt-PT");
    const time = d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    return { date, time };
  }

  // Labels para turmaModulos (o teu endpoint pode devolver estruturas diferentes)
  function turmaModuloLabel(tm) {
    const id = pick(tm, "Id", "id");
    const turmaNome = pick(tm, "TurmaNome", "turmaNome") ?? pick(tm?.turma, "Nome", "nome") ?? "";
    const moduloNome = pick(tm, "ModuloNome", "moduloNome") ?? pick(tm?.modulo, "Nome", "nome") ?? "";
    const formadorNome = pick(tm, "FormadorNome", "formadorNome") ?? pick(tm?.formador?.user, "Nome", "nome") ?? "";

    const bits = [turmaNome, moduloNome].filter(Boolean).join(" - ");
    const extra = formadorNome ? ` (${formadorNome})` : "";
    return `${bits || `TurmaModulo #${id}`}${extra}`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">
                Gestão de Sessões
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Consulta horários por turma/sala/formador e agenda sessões
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium"
              >
                Voltar
              </button>

              <button
                onClick={openCreate}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white
                           hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 font-medium shadow-lg shadow-emerald-500/30"
              >
                Nova Sessão
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              {/* Modo */}
              <div className="w-full lg:w-56">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                  Ver horário por
                </label>
                <select
                  value={mode}
                  onChange={(e) => {
                    setMode(e.target.value);
                    setTargetId("");
                    setSessoes([]);
                  }}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  disabled={loadingBase}
                >
                  <option value="turma">Turma</option>
                  <option value="sala">Sala</option>
                  <option value="formador">Formador</option>
                </select>
              </div>

              {/* Target */}
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                  {mode === "turma" ? "Turma" : mode === "sala" ? "Sala" : "Formador (ID)"}
                </label>

                {mode === "turma" ? (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    disabled={loadingBase}
                  >
                    <option value="">Seleciona uma turma...</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                ) : mode === "sala" ? (
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    disabled={loadingBase}
                  >
                    <option value="">Seleciona uma sala...</option>
                    {salas.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome} ({s.tipo}, {s.capacidade} pessoas)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                               focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    disabled={loadingBase}
                  />
                )}
              </div>

              {/* Datas */}
              <div className="w-full lg:w-60">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                  Data início
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div className="w-full lg:w-60">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                  Data fim
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Search + contador */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
              <div className="flex-1">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar por turma, sala, módulo, formador ou ID..."
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                             focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20
                              rounded-lg border border-emerald-200 dark:border-emerald-800">
                <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                  {filtered.length} {filtered.length === 1 ? "sessão" : "sessões"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300
                          px-5 py-4 rounded-xl mb-6 text-sm shadow-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    ID
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Turma
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Módulo
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Formador
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Sala
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Início
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Fim
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loadingBase || loadingSessoes ? (
                  <tr>
                    <td colSpan="8" className="py-16 px-6 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                      <p className="mt-3 text-gray-500 dark:text-gray-400">
                        {loadingBase ? "A carregar dados base..." : "A carregar sessões..."}
                      </p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-16 px-6 text-center text-gray-500 dark:text-gray-400">
                      <div className="text-lg font-medium mb-2">Nenhuma sessão encontrada</div>
                      <div className="text-sm">
                        Seleciona uma {mode === "turma" ? "turma" : mode === "sala" ? "sala" : "ID de formador"} e define o intervalo de datas.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => {
                    const ini = formatDateTime(s.horarioInicio);
                    const fim = formatDateTime(s.horarioFim);
                    return (
                      <tr key={s.id} className="hover:bg-emerald-50/50 dark:hover:bg-gray-800/60 transition-colors duration-150">
                        <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 font-mono">#{s.id}</td>
                        <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100 font-semibold">{s.turmaNome || "—"}</td>
                        <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">{s.moduloNome || "—"}</td>
                        <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">{s.formadorNome || "—"}</td>
                        <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">{s.salaNome || "—"}</td>
                        <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                          {typeof ini === "object" ? (
                            <div>
                              <div>{ini.date}</div>
                              <div className="text-xs text-gray-500">{ini.time}</div>
                            </div>
                          ) : (
                            ini
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                          {typeof fim === "object" ? (
                            <div>
                              <div>{fim.date}</div>
                              <div className="text-xs text-gray-500">{fim.time}</div>
                            </div>
                          ) : (
                            fim
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => deleteSessao(s.id)}
                              className="px-4 py-2 rounded-lg text-sm font-medium text-red-700 dark:text-red-400
                                         bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30
                                         transition-all duration-200"
                            >
                              Apagar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Nota sobre "editar" */}
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Nota: a tua API atual não tem endpoint para editar sessão (PUT). Se quiseres mesmo editar, tens de adicionar esse endpoint no backend.
        </div>
      </div>

      {/* Modal Create */}
      {showForm && (
        <Modal title="Nova Sessão" onClose={() => closeForm(false)} disableClose={saving}>
          <form onSubmit={saveSessao} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Módulo da Turma (TurmaModulo)
              </label>
              <select
                name="turmaModuloId"
                value={form.turmaModuloId}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={saving}
              >
                <option value="">Seleciona um módulo da turma...</option>
                {turmaModulos.map((tm) => {
                  const id = pick(tm, "Id", "id");
                  return (
                    <option key={id} value={id}>
                      {turmaModuloLabel(tm)}
                    </option>
                  );
                })}
              </select>
              {turmaModulos.length === 0 && (
                <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                  Não foi possível carregar TurmaModulos. Confirma se tens GET /api/TurmaModulos ou GET /api/Turmas/modulos.
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Sala
              </label>
              <select
                name="salaId"
                value={form.salaId}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={saving}
              >
                <option value="">Seleciona uma sala...</option>
                {salas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome} ({s.tipo}, {s.capacidade} pessoas)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Data/Hora de Início
              </label>
              <input
                type="datetime-local"
                name="horarioInicio"
                value={form.horarioInicio}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Data/Hora de Fim
              </label>
              <input
                type="datetime-local"
                name="horarioFim"
                value={form.horarioFim}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={saving}
              />
            </div>

            {error && (
              <div className="md:col-span-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800
                              text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => closeForm(false)}
                className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 font-medium"
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white
                           hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all duration-200 font-medium
                           shadow-lg shadow-emerald-500/30"
                disabled={saving}
              >
                {saving ? "A guardar..." : "Criar Sessão"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
