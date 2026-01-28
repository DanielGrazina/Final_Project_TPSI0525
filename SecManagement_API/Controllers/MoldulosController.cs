// src/pages/admin/Turmas.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

function Modal({ title, children, onClose, disableClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => !disableClose && onClose()}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border dark:border-gray-800"
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

const ESTADOS = ["Planeada", "Decorrer", "Terminada", "Cancelada"];

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

export default function AdminTurmas() {
  const navigate = useNavigate();

  const [turmas, setTurmas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [modulos, setModulos] = useState([]);

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

  // Modal: gerir módulos da turma
  const [showMods, setShowMods] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [turmaModulos, setTurmaModulos] = useState([]);
  const [modsLoading, setModsLoading] = useState(false);
  const [modsSaving, setModsSaving] = useState(false);
  const [modsError, setModsError] = useState("");

  const [tmForm, setTmForm] = useState({
    moduloId: "",
    formadorId: "",
    sequencia: "",
  });

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [tRes, cRes, mRes] = await Promise.all([
        api.get("/Turmas"),
        api.get("/Cursos"),
        api.get("/Modulos"),
      ]);

      setTurmas(Array.isArray(tRes.data) ? tRes.data : []);
      setCursos(Array.isArray(cRes.data) ? cRes.data : []);
      setModulos(Array.isArray(mRes.data) ? mRes.data : []);
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

  // --------- TURMA_MODULOS UI ---------

  async function openManageModulos(turma) {
    setSelectedTurma(turma);
    setShowMods(true);
    setModsError("");
    setTurmaModulos([]);
    setTmForm({ moduloId: "", formadorId: "", sequencia: "" });

    // carregar os módulos associados a esta turma
    setModsLoading(true);
    try {
      const res = await api.get(`/Turmas/${turma.id}/modulos`);
      setTurmaModulos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setModsError(extractError(err, "Erro ao carregar módulos da turma."));
    } finally {
      setModsLoading(false);
    }
  }

  function closeManageModulos(force = false) {
    if (!force && modsSaving) return;
    setShowMods(false);
    setSelectedTurma(null);
    setTurmaModulos([]);
    setModsError("");
  }

  function onChangeTmForm(e) {
    const { name, value } = e.target;
    setTmForm((p) => ({ ...p, [name]: value }));
  }

  async function addTurmaModulo(e) {
    e.preventDefault();
    if (!selectedTurma) return;

    setModsError("");

    const moduloIdNum = Number(tmForm.moduloId);
    const formadorIdNum = Number(tmForm.formadorId);
    const sequenciaNum = Number(tmForm.sequencia);

    if (!Number.isFinite(moduloIdNum) || moduloIdNum <= 0) return alert("Seleciona um módulo.");
    if (!Number.isFinite(formadorIdNum) || formadorIdNum <= 0)
      return alert("Indica um FormadorId válido.");
    if (!Number.isFinite(sequenciaNum) || sequenciaNum <= 0)
      return alert("Sequência tem de ser um número > 0.");

    const payload = {
      TurmaId: selectedTurma.id,
      ModuloId: moduloIdNum,
      FormadorId: formadorIdNum,
      Sequencia: sequenciaNum,
    };

    setModsSaving(true);
    try {
      await api.post("/Turmas/modulos", payload);

      // refresh lista
      const res = await api.get(`/Turmas/${selectedTurma.id}/modulos`);
      setTurmaModulos(Array.isArray(res.data) ? res.data : []);

      // limpar form
      setTmForm({ moduloId: "", formadorId: "", sequencia: "" });
    } catch (err) {
      setModsError(extractError(err, "Erro ao associar módulo à turma."));
    } finally {
      setModsSaving(false);
    }
  }

  async function removeTurmaModulo(turmaModuloId) {
    if (!selectedTurma) return;
    if (!window.confirm("Remover este módulo da turma?")) return;

    setModsError("");
    try {
      await api.delete(`/Turmas/modulos/${turmaModuloId}`);
      setTurmaModulos((prev) => prev.filter((x) => x.id !== turmaModuloId));
    } catch (err) {
      setModsError(extractError(err, "Erro ao remover módulo da turma."));
    }
  }

  // Para evitar associar o mesmo módulo 2x (backend já deve bloquear com UNIQUE, mas no UI fica melhor)
  const moduloIdsJaUsados = useMemo(() => new Set(turmaModulos.map((x) => x.moduloId)), [turmaModulos]);
  const modulosDisponiveis = useMemo(
    () => modulos.filter((m) => !moduloIdsJaUsados.has(m.id)),
    [modulos, moduloIdsJaUsados]
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="container mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Turmas</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gestão de turmas + associação de módulos (Turma_Modulos).
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
              + Nova Turma
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm p-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
            <div className="flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome, curso, local ou ID..."
                className="w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Estado:</span>
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
              >
                <option value="Todos">Todos</option>
                {ESTADOS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>

              <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                Total: <span className="font-semibold">{filtered.length}</span>
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
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Nome</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Curso</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Início</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Fim</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Local</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Estado</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                      A carregar...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                      Sem turmas para mostrar.
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{t.id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{t.nome}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {t.cursoNome || `#${t.cursoId}`}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {toDateInputValue(t.dataInicio) || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {toDateInputValue(t.dataFim) || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{t.local || "—"}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{t.estado || "Planeada"}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openManageModulos(t)}
                            className="px-3 py-1.5 rounded text-sm font-medium text-blue-700 hover:bg-blue-50
                                       dark:text-blue-300 dark:hover:bg-blue-900/20"
                          >
                            Módulos
                          </button>

                          <button
                            onClick={() => deleteTurma(t.id)}
                            className="px-3 py-1.5 rounded text-sm font-medium text-red-700 hover:bg-red-50
                                       dark:text-red-300 dark:hover:bg-red-900/20"
                          >
                            Apagar
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

      {/* Modal Create Turma */}
      {showForm && (
        <Modal title="Nova Turma" onClose={() => closeForm(false)} disableClose={saving}>
          <form onSubmit={saveTurma} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Nome</label>
              <input
                name="nome"
                value={form.nome}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                placeholder="Ex: TPSI 0525"
                disabled={saving}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Curso</label>
              <select
                name="cursoId"
                value={form.cursoId}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Data Início</label>
              <input
                type="date"
                name="dataInicio"
                value={form.dataInicio}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Data Fim</label>
              <input
                type="date"
                name="dataFim"
                value={form.dataFim}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Local</label>
              <input
                name="local"
                value={form.local}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                placeholder="Ex: ATEC"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Estado</label>
              <select
                name="estado"
                value={form.estado}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                disabled={saving}
              >
                {ESTADOS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tem de ser exatamente um destes valores.
              </p>
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => closeForm(false)}
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
                {saving ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Manage Turma_Modulos */}
      {showMods && selectedTurma && (
        <Modal
          title={`Módulos da turma: ${selectedTurma.nome} (#${selectedTurma.id})`}
          onClose={() => closeManageModulos(false)}
          disableClose={modsSaving}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Associados</h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Total: <span className="font-semibold">{turmaModulos.length}</span>
                </span>
              </div>

              {modsError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-3 text-sm whitespace-pre-wrap">
                  {modsError}
                </div>
              )}

              <div className="border rounded-lg overflow-hidden dark:border-gray-800">
                <div className="max-h-[360px] overflow-auto">
                  <table className="min-w-full">
                    <thead className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
                      <tr>
                        <th className="text-left text-xs font-semibold text-gray-700 dark:text-gray-200 py-2 px-3">
                          Seq
                        </th>
                        <th className="text-left text-xs font-semibold text-gray-700 dark:text-gray-200 py-2 px-3">
                          Módulo
                        </th>
                        <th className="text-left text-xs font-semibold text-gray-700 dark:text-gray-200 py-2 px-3">
                          Formador
                        </th>
                        <th className="text-left text-xs font-semibold text-gray-700 dark:text-gray-200 py-2 px-3">
                          Ação
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {modsLoading ? (
                        <tr>
                          <td colSpan="4" className="py-6 px-3 text-center text-sm text-gray-500 dark:text-gray-400">
                            A carregar...
                          </td>
                        </tr>
                      ) : turmaModulos.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="py-6 px-3 text-center text-sm text-gray-500 dark:text-gray-400">
                            Ainda sem módulos associados.
                          </td>
                        </tr>
                      ) : (
                        [...turmaModulos]
                          .sort((a, b) => (a.sequencia ?? 0) - (b.sequencia ?? 0))
                          .map((x) => (
                            <tr
                              key={x.id}
                              className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                            >
                              <td className="py-2 px-3 text-sm text-gray-800 dark:text-gray-200">
                                {x.sequencia ?? "—"}
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-900 dark:text-gray-100 font-medium">
                                {x.moduloNome || `#${x.moduloId}`}
                              </td>
                              <td className="py-2 px-3 text-sm text-gray-700 dark:text-gray-300">
                                {x.formadorNome || `#${x.formadorId}`}
                              </td>
                              <td className="py-2 px-3">
                                <button
                                  onClick={() => removeTurmaModulo(x.id)}
                                  className="px-2.5 py-1 rounded text-xs font-semibold text-red-700 hover:bg-red-50
                                             dark:text-red-300 dark:hover:bg-red-900/20"
                                  disabled={modsSaving}
                                >
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Nota: o backend já bloqueia duplicados (UNIQUE TurmaId+ModuloId). Aqui também escondemos módulos já usados.
              </p>
            </div>

            {/* Right: add form */}
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Adicionar módulo à turma</h4>

              <form onSubmit={addTurmaModulo} className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Módulo</label>
                  <select
                    name="moduloId"
                    value={tmForm.moduloId}
                    onChange={onChangeTmForm}
                    className="mt-1 w-full border rounded px-3 py-2
                               bg-white dark:bg-gray-900 dark:border-gray-800
                               text-gray-900 dark:text-gray-100"
                    disabled={modsSaving}
                  >
                    <option value="">Seleciona um módulo...</option>
                    {modulosDisponiveis.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome} (#{m.id} · {m.cargaHoraria}h)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">FormadorId</label>
                  <input
                    name="formadorId"
                    value={tmForm.formadorId}
                    onChange={onChangeTmForm}
                    className="mt-1 w-full border rounded px-3 py-2
                               bg-white dark:bg-gray-900 dark:border-gray-800
                               text-gray-900 dark:text-gray-100"
                    placeholder="Ex: 3"
                    disabled={modsSaving}
                    inputMode="numeric"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Ainda não tens endpoint para listar formadores. Quando tiveres (ex: GET /Formadores), trocamos isto por dropdown.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Sequência</label>
                  <input
                    name="sequencia"
                    value={tmForm.sequencia}
                    onChange={onChangeTmForm}
                    className="mt-1 w-full border rounded px-3 py-2
                               bg-white dark:bg-gray-900 dark:border-gray-800
                               text-gray-900 dark:text-gray-100"
                    placeholder="Ex: 1"
                    disabled={modsSaving}
                    inputMode="numeric"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => closeManageModulos(false)}
                    className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-60
                               dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
                    disabled={modsSaving}
                  >
                    Fechar
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={modsSaving}
                  >
                    {modsSaving ? "A associar..." : "Associar"}
                  </button>
                </div>
              </form>

              <div className="mt-4 p-3 rounded-lg border bg-gray-50 dark:bg-gray-800/40 dark:border-gray-800">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Dica rápida</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Se não souberes o <strong>FormadorId</strong>, abre a tabela <strong>Formadores</strong> no DB e vê o Id.
                  Depois, quando criarmos um endpoint de listagem, isto fica automático.
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
