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

// "YYYY-MM-DD" -> ISO UTC com Z (evita Npgsql timestamp with time zone)
function toIsoUtcAtMidnight(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00Z`).toISOString();
}

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

// tenta apanhar role e name/email em diferentes formatos de DTO
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

  // Modal criar turma
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    cursoId: "",
    dataInicio: "",
    dataFim: "",
    local: "",
    estado: "Planeada",
  });

  // ===== Modal Turma -> Módulos (TurmaModulo) =====
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

  // ======= MODAL: MÓDULOS DA TURMA =======

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
      // ✅ módulos vêm de /Modulos
      // ✅ formadores vêm de /Users (role=Formador)
      // ✅ associados vêm de /Turmas/{id}/modulos
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
      // ✅ POST para criar TurmaModulo
      await api.post("/Turmas/modulos", payload);

      // refresh
      await refreshAssociados(turmaId);

      // limpa só o módulo (mantém formador/seq)
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="container mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Turmas</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gestão de turmas + associação de módulos (TurmaModulo).
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

            <button onClick={openCreate} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
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
                            onClick={() => openModulosModal(t)}
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

      {/* Modal Create */}
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
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tem de ser exatamente um destes valores.</p>
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

      {/* Modal Turma -> Módulos */}
      {showModulos && selectedTurma && (
        <Modal
          title={`Módulos da Turma — ${selectedTurma.nome} (#${selectedTurma.id})`}
          onClose={() => closeModulosModal(false)}
          disableClose={modSaving}
        >
          {modError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm whitespace-pre-wrap">
              {modError}
            </div>
          )}

          {modLoading ? (
            <div className="py-10 text-center text-gray-500 dark:text-gray-400">A carregar...</div>
          ) : (
            <>
              <form onSubmit={associarModulo} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Módulo</label>
                  <select
                    value={assocForm.moduloId}
                    onChange={(e) => setAssocForm((p) => ({ ...p, moduloId: e.target.value }))}
                    className="mt-1 w-full border rounded px-3 py-2
                               bg-white dark:bg-gray-900 dark:border-gray-800
                               text-gray-900 dark:text-gray-100"
                    disabled={modSaving}
                  >
                    <option value="">Seleciona um módulo...</option>
                    {modulosDisponiveis.map((m) => {
                      const disabled = associadosSet.has(Number(m.id));
                      return (
                        <option key={m.id} value={m.id} disabled={disabled}>
                          {m.nome} ({m.cargaHoraria}h){disabled ? " — já associado" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Lista vem de <code>/api/Modulos</code>.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Formador</label>
                  <select
                    value={assocForm.formadorId}
                    onChange={(e) => setAssocForm((p) => ({ ...p, formadorId: e.target.value }))}
                    className="mt-1 w-full border rounded px-3 py-2
                               bg-white dark:bg-gray-900 dark:border-gray-800
                               text-gray-900 dark:text-gray-100"
                    disabled={modSaving}
                  >
                    <option value="">Seleciona...</option>
                    {formadores.map((u) => (
                      <option key={getUserId(u)} value={getUserId(u)}>
                        {getUserDisplay(u)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Lista vem de <code>/api/Users</code> filtrado por role <strong>Formador</strong>.
                  </p>
                </div>

                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Sequência</label>
                  <input
                    type="number"
                    min="1"
                    value={assocForm.sequencia}
                    onChange={(e) => setAssocForm((p) => ({ ...p, sequencia: e.target.value }))}
                    className="mt-1 w-full border rounded px-3 py-2
                               bg-white dark:bg-gray-900 dark:border-gray-800
                               text-gray-900 dark:text-gray-100"
                    disabled={modSaving}
                  />

                  <button
                    type="submit"
                    className="mt-3 px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                    disabled={modSaving}
                  >
                    {modSaving ? "A associar..." : "Associar módulo"}
                  </button>
                </div>
              </form>

              <div className="bg-gray-50 dark:bg-gray-950/40 border dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b dark:border-gray-800 flex items-center justify-between">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    Módulos associados ({associadosOrdenados.length})
                  </div>
                </div>

                {associadosOrdenados.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-gray-600 dark:text-gray-400">
                    Ainda não há módulos associados a esta turma.
                  </div>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100 dark:bg-gray-900 border-b dark:border-gray-800">
                        <tr>
                          <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">
                            Seq
                          </th>
                          <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">
                            Módulo
                          </th>
                          <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">
                            Formador
                          </th>
                          <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">
                            Ações
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {associadosOrdenados.map((tm) => (
                          <tr
                            key={tm.id}
                            className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                          >
                            <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                              {tm.sequencia ?? "—"}
                            </td>

                            <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                              {tm.moduloNome || `#${tm.moduloId}`}
                            </td>

                            <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                              {tm.formadorNome || `#${tm.formadorId}`}
                            </td>

                            <td className="py-3 px-4">
                              <button
                                onClick={() => removerAssociacao(tm.id)}
                                className="px-3 py-1.5 rounded text-sm font-medium text-red-700 hover:bg-red-50
                                           dark:text-red-300 dark:hover:bg-red-900/20"
                                disabled={modSaving}
                              >
                                Remover
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                Endpoints usados: <code>/api/Modulos</code>, <code>/api/Users</code>,{" "}
                <code>/api/Turmas/{selectedTurma.id}/modulos</code>, <code>/api/Turmas/modulos</code>.
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}
