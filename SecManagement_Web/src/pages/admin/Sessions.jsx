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

function toDateTimeLocalValue(dateLike) {
  if (!dateLike) return "";
  const str = String(dateLike);
  if (str.length >= 16) return str.slice(0, 16);
  return "";
}

function toIsoUtc(dateTimeStr) {
  if (!dateTimeStr) return null;
  return new Date(dateTimeStr).toISOString();
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

export default function AdminSessions() {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [salas, setSalas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    turmaId: "",
    salaId: "",
    dataInicio: "",
    dataFim: "",
    observacoes: "",
  });

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [sessRes, turmasRes, salasRes] = await Promise.all([
        api.get("/Sessions"),
        api.get("/Turmas"),
        api.get("/Salas"),
      ]);

      setSessions(Array.isArray(sessRes.data) ? sessRes.data : []);
      setTurmas(Array.isArray(turmasRes.data) ? turmasRes.data : []);
      setSalas(Array.isArray(salasRes.data) ? salasRes.data : []);
    } catch (err) {
      setError(extractError(err, "Erro ao carregar dados."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const d = dateFilter ? toDateInputValue(dateFilter) : "";

    return sessions.filter((sess) => {
      const matchesSearch =
        !s ||
        String(sess.id ?? "").includes(s) ||
        (sess.turmaNome || "").toLowerCase().includes(s) ||
        (sess.salaNome || "").toLowerCase().includes(s) ||
        (sess.observacoes || "").toLowerCase().includes(s);

      const matchesDate = !d || toDateInputValue(sess.dataInicio).startsWith(d);

      return matchesSearch && matchesDate;
    });
  }, [sessions, search, dateFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      turmaId: "",
      salaId: "",
      dataInicio: "",
      dataFim: "",
      observacoes: "",
    });
    setError("");
    setShowForm(true);
  }

  function openEdit(session) {
    setEditing(session);
    setForm({
      turmaId: session.turmaId ?? "",
      salaId: session.salaId ?? "",
      dataInicio: toDateTimeLocalValue(session.dataInicio),
      dataFim: toDateTimeLocalValue(session.dataFim),
      observacoes: session.observacoes ?? "",
    });
    setError("");
    setShowForm(true);
  }

  function closeForm(force = false) {
    if (!force && saving) return;
    setShowForm(false);
    setEditing(null);
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function saveSession(e) {
    e.preventDefault();
    setError("");

    const turmaId = Number(form.turmaId);
    const salaId = Number(form.salaId);
    const observacoes = (form.observacoes ?? "").trim();

    if (!Number.isFinite(turmaId) || turmaId <= 0) return alert("Seleciona uma turma.");
    if (!Number.isFinite(salaId) || salaId <= 0) return alert("Seleciona uma sala.");
    if (!form.dataInicio) return alert("Data/hora de início é obrigatória.");
    if (!form.dataFim) return alert("Data/hora de fim é obrigatória.");

    const dataInicioIso = toIsoUtc(form.dataInicio);
    const dataFimIso = toIsoUtc(form.dataFim);

    if (!dataInicioIso || !dataFimIso) return alert("Datas/horas inválidas.");

    if (new Date(dataFimIso) <= new Date(dataInicioIso)) {
      return alert("A data/hora de fim deve ser posterior à de início.");
    }

    const payload = {
      TurmaId: turmaId,
      SalaId: salaId,
      DataInicio: dataInicioIso,
      DataFim: dataFimIso,
      Observacoes: observacoes,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/Sessions/${editing.id}`, payload);
      } else {
        await api.post("/Sessions", payload);
      }

      closeForm(true);
      await loadAll();
    } catch (err) {
      console.log(editing ? "PUT /Sessions FAIL" : "POST /Sessions FAIL", {
        status: err.response?.status,
        data: err.response?.data,
        payloadSent: payload,
      });
      setError(extractError(err, "Erro ao guardar sessão."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession(id) {
    if (!window.confirm("Tens a certeza que queres apagar esta sessão?")) return;

    setError("");
    try {
      await api.delete(`/Sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(extractError(err, "Erro ao apagar sessão."));
    }
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
                Agende sessões de formação com turmas e salas
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                           hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium"
              >
                ← Voltar
              </button>

              <button
                onClick={openCreate}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white 
                           hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 font-medium shadow-lg shadow-emerald-500/30"
              >
                + Nova Sessão
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
            <div className="flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Pesquisar por turma, sala, observações ou ID..."
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Data:</span>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter("")}
                    className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    title="Limpar filtro"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 
                              rounded-lg border border-emerald-200 dark:border-emerald-800">
                <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                  {filtered.length} {filtered.length === 1 ? 'sessão' : 'sessões'}
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
                    Sala
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Início
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Fim
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Observações
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-16 px-6 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                      <p className="mt-3 text-gray-500 dark:text-gray-400">A carregar sessões...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 px-6 text-center text-gray-500 dark:text-gray-400">
                      <div className="text-4xl mb-2">📅</div>
                      Nenhuma sessão encontrada
                    </td>
                  </tr>
                ) : (
                  filtered.map((sess) => (
                    <tr
                      key={sess.id}
                      className="hover:bg-emerald-50/50 dark:hover:bg-gray-800/60 transition-colors duration-150"
                    >
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 font-mono">
                        #{sess.id}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100 font-semibold">
                        {sess.turmaNome || `#${sess.turmaId}`}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                        {sess.salaNome || `#${sess.salaId}`}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                        {sess.dataInicio ? (
                          <div>
                            <div>{toDateInputValue(sess.dataInicio)}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(sess.dataInicio).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                        {sess.dataFim ? (
                          <div>
                            <div>{toDateInputValue(sess.dataFim)}</div>
                            <div className="text-xs text-gray-500">
                              {new Date(sess.dataFim).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400">
                        {sess.observacoes ? (
                          <span className="line-clamp-2" title={sess.observacoes}>
                            {sess.observacoes}
                          </span>
                        ) : "—"}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEdit(sess)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-yellow-700 dark:text-yellow-400 
                                       bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 
                                       transition-all duration-200"
                          >
                            ✏️ Editar
                          </button>

                          <button
                            onClick={() => deleteSession(sess.id)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 
                                       bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 
                                       transition-all duration-200"
                          >
                            🗑️ Apagar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Create/Edit */}
      {showForm && (
        <Modal
          title={editing ? "✏️ Editar Sessão" : "✨ Nova Sessão"}
          onClose={() => closeForm(false)}
          disableClose={saving}
        >
          <form onSubmit={saveSession} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Turma
              </label>
              <select
                name="turmaId"
                value={form.turmaId}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={saving}
              >
                <option value="">Seleciona uma turma...</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
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
                name="dataInicio"
                value={form.dataInicio}
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
                name="dataFim"
                value={form.dataFim}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={saving}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Observações (opcional)
              </label>
              <textarea
                name="observacoes"
                value={form.observacoes}
                onChange={onChange}
                rows="3"
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                placeholder="Notas sobre a sessão..."
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
                {saving ? "A guardar..." : editing ? "Guardar Alterações" : "Criar Sessão"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}