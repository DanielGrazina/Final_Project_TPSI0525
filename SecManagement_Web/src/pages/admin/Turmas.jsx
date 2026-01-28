// src/pages/admin/Turmas.jsx
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
        className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h3>
          <button
            onClick={onClose}
            disabled={disableClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                       hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-all duration-200
                       font-medium text-sm"
          >
            Fechar
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

const ESTADOS = ["Planeada", "Decorrer", "Terminada", "Cancelada"];

const estadoColors = {
  Planeada: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Decorrer: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Terminada: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300",
  Cancelada: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function toDateInputValue(dateLike) {
  if (!dateLike) return "";
  return String(dateLike).slice(0, 10);
}

function toIsoUtcAtMidnight(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00Z`).toISOString();
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

function getUserRole(u) {
  return String(u?.role ?? u?.Role ?? u?.perfil ?? u?.Perfil ?? "").trim();
}
function getUserDisplay(u) {
  return (
    u?.nome ||
    u?.Nome ||
    u?.name ||
    u?.Name ||
    u?.email ||
    u?.Email ||
    (u?.userName ?? u?.UserName) ||
    `User #${u?.id ?? u?.Id ?? "?"}`
  );
}
function getUserId(u) {
  return Number(u?.id ?? u?.Id);
}

export default function AdminTurmas() {
  const navigate = useNavigate();

  const [turmas, setTurmas] = useState([]);
  const [cursos, setCursos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("Todos");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    cursoId: "",
    dataInicio: "",
    dataFim: "",
    local: "",
    estado: "Planeada",
  });

  const [showModulos, setShowModulos] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState(null);

  const [modulosDisponiveis, setModulosDisponiveis] = useState([]);
  const [formadores, setFormadores] = useState([]);
  const [associados, setAssociados] = useState([]);

  const [modLoading, setModLoading] = useState(false);
  const [modSaving, setModSaving] = useState(false);
  const [modError, setModError] = useState("");

  const [assocForm, setAssocForm] = useState({
    moduloId: "",
    formadorId: "",
    sequencia: 1,
  });

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [tRes, cRes] = await Promise.all([api.get("/Turmas"), api.get("/Cursos")]);
      setTurmas(Array.isArray(tRes.data) ? tRes.data : []);
      setCursos(Array.isArray(cRes.data) ? cRes.data : []);
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

    return turmas.filter((t) => {
      const cursoNome = (t.cursoNome ?? "").toLowerCase();

      const matchesSearch =
        !s ||
        (t.nome || "").toLowerCase().includes(s) ||
        cursoNome.includes(s) ||
        (t.local || "").toLowerCase().includes(s) ||
        String(t.id ?? "").includes(s);

      const matchesEstado = estadoFilter === "Todos" ? true : t.estado === estadoFilter;

      return matchesSearch && matchesEstado;
    });
  }, [turmas, search, estadoFilter]);

  function openCreate() {
    setForm({
      nome: "",
      cursoId: "",
      dataInicio: "",
      dataFim: "",
      local: "",
      estado: "Planeada",
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

  async function saveTurma(e) {
    e.preventDefault();
    setError("");

    const nome = (form.nome ?? "").trim();
    const cursoIdNum = Number(form.cursoId);
    const local = (form.local ?? "").trim();
    const estado = (form.estado ?? "").trim();

    if (!nome) return alert("O nome é obrigatório.");
    if (!Number.isFinite(cursoIdNum) || cursoIdNum <= 0) return alert("Seleciona um curso.");
    if (!form.dataInicio) return alert("Data de início é obrigatória.");
    if (!form.dataFim) return alert("Data de fim é obrigatória.");
    if (!ESTADOS.includes(estado)) return alert("Estado inválido.");

    const dataInicioIso = toIsoUtcAtMidnight(form.dataInicio);
    const dataFimIso = toIsoUtcAtMidnight(form.dataFim);

    if (!dataInicioIso || !dataFimIso) return alert("Datas inválidas.");

    if (new Date(dataFimIso) < new Date(dataInicioIso)) {
      return alert("A data de fim não pode ser anterior à data de início.");
    }

    const payload = {
      Nome: nome,
      CursoId: cursoIdNum,
      DataInicio: dataInicioIso,
      DataFim: dataFimIso,
      Local: local,
      Estado: estado,
    };

    setSaving(true);
    try {
      await api.post("/Turmas", payload);
      closeForm(true);
      await loadAll();
    } catch (err) {
      console.log("POST /Turmas FAIL", {
        status: err.response?.status,
        data: err.response?.data,
        payloadSent: payload,
      });
      setError(extractError(err, "Erro ao criar turma."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTurma(id) {
    if (!window.confirm("Tens a certeza que queres apagar esta turma?")) return;

    setError("");
    try {
      await api.delete(`/Turmas/${id}`);
      setTurmas((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(extractError(err, "Erro ao apagar turma."));
    }
  }

  async function openModulosModal(turma) {
    setSelectedTurma(turma);
    setShowModulos(true);

    setModError("");
    setModLoading(true);
    setAssociados([]);
    setModulosDisponiveis([]);
    setFormadores([]);
    setAssocForm({ moduloId: "", formadorId: "", sequencia: 1 });

    try {
      const [mRes, uRes, aRes] = await Promise.all([
        api.get("/Modulos"),
        api.get("/Users"),
        api.get(`/Turmas/${turma.id}/modulos`),
      ]);

      setModulosDisponiveis(Array.isArray(mRes.data) ? mRes.data : []);

      const users = Array.isArray(uRes.data) ? uRes.data : [];
      const onlyFormadores = users.filter((u) => getUserRole(u).toLowerCase() === "formador");
      setFormadores(onlyFormadores);

      setAssociados(Array.isArray(aRes.data) ? aRes.data : []);
    } catch (err) {
      setModError(extractError(err, "Erro ao carregar dados do modal."));
    } finally {
      setModLoading(false);
    }
  }

  function closeModulosModal(force = false) {
    if (!force && modSaving) return;
    setShowModulos(false);
    setSelectedTurma(null);
    setModError("");
  }

  async function refreshAssociados(turmaId) {
    const aRes = await api.get(`/Turmas/${turmaId}/modulos`);
    setAssociados(Array.isArray(aRes.data) ? aRes.data : []);
  }

  async function associarModulo(e) {
    e.preventDefault();
    if (!selectedTurma) return;

    setModError("");

    const turmaId = Number(selectedTurma.id);
    const moduloId = Number(assocForm.moduloId);
    const formadorId = Number(assocForm.formadorId);
    const sequencia = Number(assocForm.sequencia);

    if (!Number.isFinite(moduloId) || moduloId <= 0) return alert("Seleciona um módulo.");
    if (!Number.isFinite(formadorId) || formadorId <= 0) return alert("Seleciona um formador.");
    if (!Number.isFinite(sequencia) || sequencia <= 0) return alert("Sequência inválida.");

    const jaExiste = (associados || []).some((x) => Number(x.moduloId) === moduloId);
    if (jaExiste) return alert("Este módulo já está associado a esta turma.");

    const payload = {
      TurmaId: turmaId,
      ModuloId: moduloId,
      FormadorId: formadorId,
      Sequencia: sequencia,
    };

    setModSaving(true);
    try {
      await api.post("/Turmas/modulos", payload);
      await refreshAssociados(turmaId);
      setAssocForm((p) => ({ ...p, moduloId: "" }));
    } catch (err) {
      console.log("POST /Turmas/modulos FAIL", {
        status: err.response?.status,
        data: err.response?.data,
        payloadSent: payload,
      });
      setModError(extractError(err, "Erro ao associar módulo."));
    } finally {
      setModSaving(false);
    }
  }

  async function removerAssociacao(turmaModuloId) {
    if (!window.confirm("Remover este módulo da turma?")) return;

    setModError("");
    try {
      await api.delete(`/Turmas/modulos/${turmaModuloId}`);
      if (selectedTurma) await refreshAssociados(selectedTurma.id);
    } catch (err) {
      setModError(extractError(err, "Erro ao remover associação."));
    }
  }

  const associadosOrdenados = useMemo(() => {
    const arr = Array.isArray(associados) ? [...associados] : [];
    arr.sort((a, b) => {
      const sa = Number(a.sequencia ?? 0);
      const sb = Number(b.sequencia ?? 0);
      if (sa !== sb) return sa - sb;
      return Number(a.id ?? 0) - Number(b.id ?? 0);
    });
    return arr;
  }, [associados]);

  const associadosSet = useMemo(() => {
    const s = new Set();
    (associados || []).forEach((x) => {
      const mid = Number(x.moduloId);
      if (Number.isFinite(mid)) s.add(mid);
    });
    return s;
  }, [associados]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">
                Gestão de Turmas
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Administre turmas e associe módulos com formadores
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
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white 
                           hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg shadow-blue-500/30"
              >
                + Nova Turma
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
                placeholder="🔍 Pesquisar por nome, curso, local ou ID..."
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Estado:</span>
                <select
                  value={estadoFilter}
                  onChange={(e) => setEstadoFilter(e.target.value)}
                  className="border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Todos">Todos</option>
                  {ESTADOS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 
                              rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-semibold text-blue-900 dark:text-blue-300">
                  {filtered.length} {filtered.length === 1 ? 'turma' : 'turmas'}
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
                    Nome
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Curso
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Início
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Fim
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Local
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Estado
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-16 px-6 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-3 text-gray-500 dark:text-gray-400">A carregar turmas...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-16 px-6 text-center text-gray-500 dark:text-gray-400">
                      <div className="text-4xl mb-2">📚</div>
                      Nenhuma turma encontrada
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-blue-50/50 dark:hover:bg-gray-800/60 transition-colors duration-150"
                    >
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 font-mono">
                        #{t.id}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100 font-semibold">
                        {t.nome}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                        {t.cursoNome || `#${t.cursoId}`}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                        {toDateInputValue(t.dataInicio) || "—"}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                        {toDateInputValue(t.dataFim) || "—"}
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                        {t.local || "—"}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoColors[t.estado] || estadoColors.Planeada}`}>
                          {t.estado || "Planeada"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openModulosModal(t)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-400 
                                       bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 
                                       transition-all duration-200"
                          >
                            📘 Módulos
                          </button>

                          <button
                            onClick={() => deleteTurma(t.id)}
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

      {/* Modal Create */}
      {showForm && (
        <Modal title="✨ Nova Turma" onClose={() => closeForm(false)} disableClose={saving}>
          <form onSubmit={saveTurma} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Nome da Turma
              </label>
              <input
                name="nome"
                value={form.nome}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Ex: TPSI 0525"
                disabled={saving}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Curso
              </label>
              <select
                name="cursoId"
                value={form.cursoId}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={saving}
              >
                <option value="">Seleciona um curso...</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Data de Início
              </label>
              <input
                type="date"
                name="dataInicio"
                value={form.dataInicio}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Data de Fim
              </label>
              <input
                type="date"
                name="dataFim"
                value={form.dataFim}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Local
              </label>
              <input
                name="local"
                value={form.local}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Ex: ATEC"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Estado
              </label>
              <select
                name="estado"
                value={form.estado}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                disabled={saving}
              >
                {ESTADOS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
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
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white 
                           hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium
                           shadow-lg shadow-blue-500/30"
                disabled={saving}
              >
                {saving ? "A guardar..." : "Guardar Turma"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Turma -> Módulos */}
      {showModulos && selectedTurma && (
        <Modal
          title={`📚 Módulos — ${selectedTurma.nome}`}
          onClose={() => closeModulosModal(false)}
          disableClose={modSaving}
        >
          {modError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 
                            px-4 py-3 rounded-lg mb-5 text-sm">
              {modError}
            </div>
          )}

          {modLoading ? (
            <div className="py-16 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-3 text-gray-500 dark:text-gray-400">A carregar módulos...</p>
            </div>
          ) : (
            <>
              <form onSubmit={associarModulo} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-blue-200 dark:border-gray-700">
                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                    Módulo
                  </label>
                  <select
                    value={assocForm.moduloId}
                    onChange={(e) => setAssocForm((p) => ({ ...p, moduloId: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={modSaving}
                  >
                    <option value="">Seleciona...</option>
                    {modulosDisponiveis.map((m) => {
                      const disabled = associadosSet.has(Number(m.id));
                      return (
                        <option key={m.id} value={m.id} disabled={disabled}>
                          {m.nome} ({m.cargaHoraria}h){disabled ? " ✓" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                    Formador
                  </label>
                  <select
                    value={assocForm.formadorId}
                    onChange={(e) => setAssocForm((p) => ({ ...p, formadorId: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={modSaving}
                  >
                    <option value="">Seleciona...</option>
                    {formadores.map((u) => (
                      <option key={getUserId(u)} value={getUserId(u)}>
                        {getUserDisplay(u)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                    Sequência
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={assocForm.sequencia}
                    onChange={(e) => setAssocForm((p) => ({ ...p, sequencia: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={modSaving}
                  />

                  <button
                    type="submit"
                    className="mt-3 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white 
                               hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 
                               font-medium text-sm shadow-lg shadow-blue-500/30"
                    disabled={modSaving}
                  >
                    {modSaving ? "A associar..." : "+ Associar"}
                  </button>
                </div>
              </form>

              <div className="bg-white dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <div className="font-bold text-gray-900 dark:text-gray-100">
                    Módulos Associados ({associadosOrdenados.length})
                  </div>
                </div>

                {associadosOrdenados.length === 0 ? (
                  <div className="px-5 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-2">📝</div>
                    Nenhum módulo associado ainda
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                        <tr>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-3 px-5">
                            Seq
                          </th>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-3 px-5">
                            Módulo
                          </th>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-3 px-5">
                            Formador
                          </th>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-3 px-5">
                            Ações
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {associadosOrdenados.map((tm) => (
                          <tr
                            key={tm.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors"
                          >
                            <td className="py-3 px-5 text-sm text-gray-600 dark:text-gray-400 font-mono">
                              #{tm.sequencia ?? "—"}
                            </td>

                            <td className="py-3 px-5 text-sm text-gray-900 dark:text-gray-100 font-semibold">
                              {tm.moduloNome || `#${tm.moduloId}`}
                            </td>

                            <td className="py-3 px-5 text-sm text-gray-700 dark:text-gray-300">
                              {tm.formadorNome || `#${tm.formadorId}`}
                            </td>

                            <td className="py-3 px-5">
                              <button
                                onClick={() => removerAssociacao(tm.id)}
                                className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 
                                           bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 
                                           transition-all duration-200"
                                disabled={modSaving}
                              >
                                🗑️ Remover
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}