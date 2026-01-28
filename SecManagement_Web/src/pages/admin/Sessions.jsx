// src/pages/admin/Sessoes.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import RequireRole from "../../components/RequireRole";

// Modal simples (igual ao teu estilo)
function Modal({ title, children, onClose, disableClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => !disableClose && onClose()}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            disabled={disableClose}
            className="px-3 py-1 rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-60
                       dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Fechar
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// Helpers iguais ao teu padrão
function extractError(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;

  // ValidationProblemDetails
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

// <input type="date"> => "YYYY-MM-DD"
function toDateInputValue(dateLike) {
  if (!dateLike) return "";
  return String(dateLike).slice(0, 10);
}

// <input type="datetime-local"> => "YYYY-MM-DDTHH:mm"
function toDateTimeLocalValue(dateLike) {
  if (!dateLike) return "";
  const s = String(dateLike);
  // se vier ISO completo, cortamos até minutos
  // ex: 2026-01-27T10:30:00Z -> 2026-01-27T10:30
  return s.slice(0, 16);
}

// "YYYY-MM-DD" -> ISO UTC (00:00Z)
function toIsoUtcAtMidnight(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00Z`).toISOString();
}

// "YYYY-MM-DDTHH:mm" (datetime-local) -> ISO com Z (UTC)
// Nota: datetime-local não tem timezone, então tratamos como "hora local" e convertemos para ISO.
// É consistente para API, mas se quiseres "tratar como UTC", diz e eu ajusto.
function toIsoFromDateTimeLocal(dtLocal) {
  if (!dtLocal) return null;
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function fmtDateTime(dateLike) {
  if (!dateLike) return "—";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return String(dateLike);
  return d.toLocaleString();
}

export default function AdminSessoes() {
  const navigate = useNavigate();

  // lookups
  const [turmas, setTurmas] = useState([]);
  const [salas, setSalas] = useState([]);

  // query state
  const [modo, setModo] = useState("turma"); // "turma" | "formador" | "sala"
  const [turmaId, setTurmaId] = useState("");
  const [formadorId, setFormadorId] = useState("");
  const [salaId, setSalaId] = useState("");

  const [start, setStart] = useState(() => {
    const today = new Date();
    const s = today.toISOString().slice(0, 10);
    return s;
  });
  const [end, setEnd] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });

  // data
  const [sessoes, setSessoes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingHorario, setLoadingHorario] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // modal agendar
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    turmaModuloId: "", // idealmente dropdown quando tiveres endpoint de Turma_Modulos
    salaId: "",
    horarioInicio: "",
    horarioFim: "",
  });

  async function loadLookups() {
    setLoading(true);
    setError("");

    try {
      const [tRes, sRes] = await Promise.all([
        api.get("/Turmas"),
        api.get("/Salas").catch(() => ({ data: [] })), // se endpoint for /Rooms em vez de /Salas, depois ajustamos
      ]);

      setTurmas(Array.isArray(tRes.data) ? tRes.data : []);
      setSalas(Array.isArray(sRes.data) ? sRes.data : []);
    } catch (err) {
      setError(extractError(err, "Erro ao carregar Turmas/Salas."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLookups();
  }, []);

  function openCreate() {
    setError("");
    setForm({
      turmaModuloId: "",
      salaId: "",
      horarioInicio: "",
      horarioFim: "",
    });
    setShowCreate(true);
  }

  function closeCreate(force = false) {
    if (!force && saving) return;
    setShowCreate(false);
  }

  function onFormChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function loadHorario() {
    setError("");

    const startIso = toIsoUtcAtMidnight(start);
    const endIso = toIsoUtcAtMidnight(end);

    if (!startIso || !endIso) return setError("Datas inválidas.");
    if (new Date(endIso) < new Date(startIso)) return setError("A data de fim não pode ser anterior à data de início.");

    let url = "";
    if (modo === "turma") {
      const id = Number(turmaId);
      if (!Number.isFinite(id) || id <= 0) return setError("Seleciona uma turma.");
      url = `/Sessoes/turma/${id}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
    } else if (modo === "formador") {
      const id = Number(formadorId);
      if (!Number.isFinite(id) || id <= 0) return setError("Indica um FormadorId válido.");
      url = `/Sessoes/formador/${id}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
    } else {
      const id = Number(salaId);
      if (!Number.isFinite(id) || id <= 0) return setError("Seleciona uma sala.");
      url = `/Sessoes/sala/${id}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
    }

    setLoadingHorario(true);
    try {
      const res = await api.get(url);
      setSessoes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(extractError(err, "Erro ao carregar sessões."));
      setSessoes([]);
    } finally {
      setLoadingHorario(false);
    }
  }

  async function saveSessao(e) {
    e.preventDefault();
    setError("");

    const turmaModuloIdNum = Number(form.turmaModuloId);
    const salaIdNum = Number(form.salaId);

    if (!Number.isFinite(turmaModuloIdNum) || turmaModuloIdNum <= 0) return alert("TurmaModuloId inválido.");
    if (!Number.isFinite(salaIdNum) || salaIdNum <= 0) return alert("Seleciona uma sala.");
    if (!form.horarioInicio) return alert("Seleciona horário de início.");
    if (!form.horarioFim) return alert("Seleciona horário de fim.");

    const hiIso = toIsoFromDateTimeLocal(form.horarioInicio);
    const hfIso = toIsoFromDateTimeLocal(form.horarioFim);
    if (!hiIso || !hfIso) return alert("Horários inválidos.");

    if (new Date(hfIso) <= new Date(hiIso)) return alert("A hora de fim tem de ser superior à de início.");

    // Payload PascalCase (igual ao teu padrão)
    const payload = {
      TurmaModuloId: turmaModuloIdNum,
      SalaId: salaIdNum,
      HorarioInicio: hiIso,
      HorarioFim: hfIso,
    };

    setSaving(true);
    try {
      await api.post("/Sessoes", payload);

      closeCreate(true);

      // opcional: recarrega horário se já estavas a ver alguma coisa
      await loadHorario().catch(() => {});
    } catch (err) {
      setError(extractError(err, "Erro ao agendar sessão."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSessao(id) {
    if (!window.confirm("Tens a certeza que queres apagar esta sessão?")) return;

    setError("");
    try {
      await api.delete(`/Sessoes/${id}`);
      setSessoes((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setError(extractError(err, "Erro ao apagar sessão."));
    }
  }

  const total = sessoes.length;

  const titleRight = useMemo(() => {
    if (modo === "turma") return "por Turma";
    if (modo === "formador") return "por Formador";
    return "por Sala";
  }, [modo]);

  return (
    <RequireRole roles={["Admin", "Formador"]}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
          <div className="container mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Sessões <span className="text-gray-500 dark:text-gray-400 font-normal">{titleRight}</span>
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Agendar e consultar horários (GET / POST / DELETE).
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50
                           dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Voltar
              </button>

              <button
                onClick={openCreate}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                + Agendar Sessão
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-6">
          {/* Toolbar */}
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm p-4 mb-4">
            <div className="flex flex-col xl:flex-row xl:items-end gap-3 xl:justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Modo</label>
                  <select
                    value={modo}
                    onChange={(e) => setModo(e.target.value)}
                    className="mt-1 border rounded px-3 py-2
                               bg-white dark:bg-gray-900 dark:border-gray-800
                               text-gray-900 dark:text-gray-100"
                    disabled={loading}
                  >
                    <option value="turma">Turma</option>
                    <option value="formador">Formador</option>
                    <option value="sala">Sala</option>
                  </select>
                </div>

                {modo === "turma" && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Turma</label>
                    <select
                      value={turmaId}
                      onChange={(e) => setTurmaId(e.target.value)}
                      className="mt-1 border rounded px-3 py-2 w-72
                                 bg-white dark:bg-gray-900 dark:border-gray-800
                                 text-gray-900 dark:text-gray-100"
                      disabled={loading}
                    >
                      <option value="">Seleciona...</option>
                      {turmas.map((t) => (
                        <option key={t.id} value={t.id}>
                          #{t.id} — {t.nome} {t.cursoNome ? `(${t.cursoNome})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {modo === "formador" && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">FormadorId</label>
                    <input
                      value={formadorId}
                      onChange={(e) => setFormadorId(e.target.value)}
                      placeholder="Ex: 10"
                      className="mt-1 border rounded px-3 py-2 w-48
                                 bg-white dark:bg-gray-900 dark:border-gray-800
                                 text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                      disabled={loading}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      (Aqui falta-te um endpoint de listagem de formadores, para eu trocar por dropdown.)
                    </p>
                  </div>
                )}

                {modo === "sala" && (
                  <div>
                    <label className="text-sm text-gray-600 dark:text-gray-400">Sala</label>
                    <select
                      value={salaId}
                      onChange={(e) => setSalaId(e.target.value)}
                      className="mt-1 border rounded px-3 py-2 w-72
                                 bg-white dark:bg-gray-900 dark:border-gray-800
                                 text-gray-900 dark:text-gray-100"
                      disabled={loading}
                    >
                      <option value="">Seleciona...</option>
                      {salas.map((s) => (
                        <option key={s.id} value={s.id}>
                          #{s.id} — {s.nome} {s.tipo ? `(${s.tipo})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Início</label>
                  <input
                    type="date"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="mt-1 border rounded px-3 py-2
                               bg-white dark:bg-gray-900 dark:border-gray-800
                               text-gray-900 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Fim</label>
                  <input
                    type="date"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="mt-1 border rounded px-3 py-2
                               bg-white dark:bg-gray-900 dark:border-gray-800
                               text-gray-900 dark:text-gray-100"
                  />
                </div>

                <button
                  onClick={loadHorario}
                  disabled={loading || loadingHorario}
                  className="px-4 py-2 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-60
                             dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
                >
                  {loadingHorario ? "A carregar..." : "Ver Horário"}
                </button>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total: <span className="font-semibold">{total}</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm whitespace-pre-wrap">
              {error}
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
                  <tr>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">ID</th>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Turma</th>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">
                      Módulo
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">
                      Formador
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Sala</th>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">
                      Início
                    </th>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Fim</th>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                        A carregar lookups...
                      </td>
                    </tr>
                  ) : loadingHorario ? (
                    <tr>
                      <td colSpan="8" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                        A carregar sessões...
                      </td>
                    </tr>
                  ) : sessoes.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                        Sem sessões para mostrar.
                      </td>
                    </tr>
                  ) : (
                    sessoes.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                      >
                        <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{s.id}</td>

                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                          {s.turmaNome || "—"}
                        </td>

                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {s.moduloNome || `TurmaModulo #${s.turmaModuloId}`}
                        </td>

                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{s.formadorNome || "—"}</td>

                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {s.salaNome || `#${s.salaId}`}
                        </td>

                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{fmtDateTime(s.horarioInicio)}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{fmtDateTime(s.horarioFim)}</td>

                        <td className="py-3 px-4">
                          <button
                            onClick={() => deleteSessao(s.id)}
                            className="px-3 py-1.5 rounded text-sm font-medium text-red-700 hover:bg-red-50
                                       dark:text-red-300 dark:hover:bg-red-900/20"
                          >
                            Apagar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal: Agendar */}
        {showCreate && (
          <Modal title="Agendar Sessão" onClose={() => closeCreate(false)} disableClose={saving}>
            <form onSubmit={saveSessao} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">TurmaModuloId</label>
                <input
                  name="turmaModuloId"
                  value={form.turmaModuloId}
                  onChange={onFormChange}
                  className="mt-1 w-full border rounded px-3 py-2
                             bg-white dark:bg-gray-900 dark:border-gray-800
                             text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
                  placeholder="Ex: 12"
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Quando me deres o endpoint de listagem de Turma_Modulos, eu troco isto por um dropdown com Turma + Módulo
                  + Formador.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Sala</label>
                <select
                  name="salaId"
                  value={form.salaId}
                  onChange={onFormChange}
                  className="mt-1 w-full border rounded px-3 py-2
                             bg-white dark:bg-gray-900 dark:border-gray-800
                             text-gray-900 dark:text-gray-100"
                  disabled={saving}
                >
                  <option value="">Seleciona uma sala...</option>
                  {salas.map((s) => (
                    <option key={s.id} value={s.id}>
                      #{s.id} — {s.nome} {s.tipo ? `(${s.tipo})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Início</label>
                <input
                  type="datetime-local"
                  name="horarioInicio"
                  value={form.horarioInicio}
                  onChange={onFormChange}
                  className="mt-1 w-full border rounded px-3 py-2
                             bg-white dark:bg-gray-900 dark:border-gray-800
                             text-gray-900 dark:text-gray-100"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Fim</label>
                <input
                  type="datetime-local"
                  name="horarioFim"
                  value={form.horarioFim}
                  onChange={onFormChange}
                  className="mt-1 w-full border rounded px-3 py-2
                             bg-white dark:bg-gray-900 dark:border-gray-800
                             text-gray-900 dark:text-gray-100"
                  disabled={saving}
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => closeCreate(false)}
                  className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-60
                             dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "A guardar..." : "Agendar"}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </RequireRole>
  );
}
