// src/pages/admin/Turmas.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import BurgerMenu from "../../components/BurgerMenu";

/* ---------------- helpers ---------------- */

function safeStr(x) {
  return (x ?? "").toString();
}

function extractError(err, fallback = "Ocorreu um erro.") {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if (status === 401) return "Sessão expirada. Faz login novamente.";
  if (status === 403) return "Sem permissão para executar esta ação.";

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

function toDateInputValue(dateLike) {
  if (!dateLike) return "";
  return String(dateLike).slice(0, 10);
}

function toIsoUtcAtMidnight(dateStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T00:00:00Z`).toISOString();
}

/* ---------------- UI (uniform) ---------------- */

function HeaderIcon() {
  return (
    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M8 8h8M8 12h8M8 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Btn({ children, tone = "neutral", className = "", ...props }) {
  const map = {
    neutral:
      "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800",
    blue:
      "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-950/30",
    green:
      "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-200 dark:hover:bg-emerald-950/30",
    red:
      "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-200 dark:hover:bg-red-950/30",
  };

  return (
    <button
      type="button"
      className={[
        "px-4 py-2 rounded-lg border text-sm font-semibold transition",
        "active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
        map[tone] || map.neutral,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ children, tone = "blue", className = "", ...props }) {
  const map = {
    blue: "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25",
    green: "from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-500/25",
    red: "from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-500/25",
  };

  return (
    <button
      type="button"
      className={[
        "px-4 py-2 rounded-lg font-semibold text-white transition",
        "shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
        `bg-gradient-to-r ${map[tone] || map.blue}`,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function Modal({ title, children, onClose, disabled }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !disabled && onClose()}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur">
          <h3 className="font-black text-lg text-gray-900 dark:text-gray-100">{title}</h3>
          <Btn onClick={onClose} disabled={disabled}>
            Fechar
          </Btn>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Pagination (compact like screenshot) ---------------- */

function PaginationCompact({
  total,
  page,
  pageSize,
  onPageChange,
  disabled,
  className = "",
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const btn =
    "px-3 py-2 rounded-lg border text-sm font-semibold transition " +
    "active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed " +
    "border-gray-200 text-gray-700 hover:bg-gray-50 " +
    "dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800";

  return (
    <div className={["flex items-center gap-2 justify-end", className].join(" ")}>
      <button type="button" className={btn} onClick={() => onPageChange(1)} disabled={disabled || safePage === 1}>
        «
      </button>
      <button type="button" className={btn} onClick={() => onPageChange(safePage - 1)} disabled={disabled || safePage === 1}>
        ‹
      </button>

      <div
        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                   text-sm font-semibold text-gray-700 dark:text-gray-200
                   bg-gray-50 dark:bg-gray-950/30"
      >
        Página <span className="text-gray-900 dark:text-gray-100">{safePage}</span> /{" "}
        <span className="text-gray-900 dark:text-gray-100">{totalPages}</span>
      </div>

      <button type="button" className={btn} onClick={() => onPageChange(safePage + 1)} disabled={disabled || safePage === totalPages}>
        ›
      </button>
      <button type="button" className={btn} onClick={() => onPageChange(totalPages)} disabled={disabled || safePage === totalPages}>
        »
      </button>
    </div>
  );
}

/* ---------------- domain helpers ---------------- */

const ESTADOS = ["Planeada", "Decorrer", "Terminada", "Cancelada"];

const estadoColors = {
  Planeada: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Decorrer: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Terminada: "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300",
  Cancelada: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

// FormadorDto helpers
function getFormadorId(f) {
  return Number(f?.id ?? f?.Id);
}
function getFormadorDisplay(f) {
  const nome = (f?.nome ?? f?.Nome ?? "").trim();
  const email = (f?.email ?? f?.Email ?? "").trim();
  if (nome && email) return `${nome} — ${email}`;
  return nome || email || `Formador #${getFormadorId(f) || "?"}`;
}

/* ---------------- Page ---------------- */

export default function AdminTurmas() {
  const navigate = useNavigate();

  const [turmas, setTurmas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [formadores, setFormadores] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("Todos");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25); // mantém fixo aqui (como no print). Se quiseres dropdown depois, digo-te.

  const [editingCoordTurmaId, setEditingCoordTurmaId] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    cursoId: "",
    coordenadorId: "",
    dataInicio: "",
    dataFim: "",
    local: "",
    estado: "Planeada",
  });

  // Modal Módulos
  const [showModulos, setShowModulos] = useState(false);
  const [selectedTurma, setSelectedTurma] = useState(null);

  const [modulosDisponiveis, setModulosDisponiveis] = useState([]);
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
    setInfo("");

    try {
      const [tRes, cRes, fRes] = await Promise.all([
        api.get("/Turmas"),
        api.get("/Cursos"),
        api.get("/Formadores"),
      ]);

      setTurmas(Array.isArray(tRes.data) ? tRes.data : []);
      setCursos(Array.isArray(cRes.data) ? cRes.data : []);

      const flist = Array.isArray(fRes.data) ? fRes.data : [];
      flist.sort((a, b) => getFormadorDisplay(a).localeCompare(getFormadorDisplay(b)));
      setFormadores(flist);
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

    return (turmas || []).filter((t) => {
      const nome = safeStr(t.nome).toLowerCase();
      const cursoNome = safeStr(t.cursoNome).toLowerCase();
      const coordNome = safeStr(t.coordenadorNome).toLowerCase();
      const local = safeStr(t.local).toLowerCase();
      const id = safeStr(t.id);

      const matchesSearch =
        !s ||
        nome.includes(s) ||
        cursoNome.includes(s) ||
        coordNome.includes(s) ||
        local.includes(s) ||
        id.includes(s);

      const matchesEstado = estadoFilter === "Todos" ? true : safeStr(t.estado) === estadoFilter;

      return matchesSearch && matchesEstado;
    });
  }, [turmas, search, estadoFilter]);

  // reset page when filters change
  useEffect(() => setPage(1), [search, estadoFilter]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  function openCreate() {
    setForm({
      nome: "",
      cursoId: "",
      coordenadorId: "",
      dataInicio: "",
      dataFim: "",
      local: "",
      estado: "Planeada",
    });
    setError("");
    setInfo("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function saveTurma(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    const nome = safeStr(form.nome).trim();
    const cursoIdNum = Number(form.cursoId);
    const local = safeStr(form.local).trim();
    const estado = safeStr(form.estado).trim();

    const coordRaw = safeStr(form.coordenadorId).trim();
    const coordenadorIdNum = coordRaw ? Number(coordRaw) : null;

    if (!nome) return alert("O nome é obrigatório.");
    if (!Number.isFinite(cursoIdNum) || cursoIdNum <= 0) return alert("Seleciona um curso.");
    if (!form.dataInicio) return alert("Data de início é obrigatória.");
    if (!form.dataFim) return alert("Data de fim é obrigatória.");
    if (!ESTADOS.includes(estado)) return alert("Estado inválido.");
    if (coordRaw && (!Number.isFinite(coordenadorIdNum) || coordenadorIdNum <= 0)) return alert("Coordenador inválido.");

    const dataInicioIso = toIsoUtcAtMidnight(form.dataInicio);
    const dataFimIso = toIsoUtcAtMidnight(form.dataFim);

    if (!dataInicioIso || !dataFimIso) return alert("Datas inválidas.");
    if (new Date(dataFimIso) < new Date(dataInicioIso)) return alert("A data de fim não pode ser anterior à data de início.");

    const payload = {
      Nome: nome,
      CursoId: cursoIdNum,
      CoordenadorId: coordenadorIdNum,
      DataInicio: dataInicioIso,
      DataFim: dataFimIso,
      Local: local,
      Estado: estado,
    };

    setSaving(true);
    try {
      await api.post("/Turmas", payload);
      setShowForm(false);
      setInfo("Turma criada.");
      await loadAll();
      setTimeout(() => setInfo(""), 1200);
    } catch (err) {
      setError(extractError(err, "Erro ao criar turma."));
    } finally {
      setSaving(false);
    }
  }

  async function updateCoordenador(turmaId, newCoordId) {
    setError("");
    setInfo("");
    try {
      const res = await api.patch(`/Turmas/${turmaId}/coordenador`, {
        CoordenadorId: newCoordId || null,
      });
      setTurmas((prev) =>
        prev.map((t) => (t.id === turmaId ? { ...t, ...res.data } : t))
      );
      setEditingCoordTurmaId(null);
      setInfo("Coordenador atualizado.");
      setTimeout(() => setInfo(""), 1200);
    } catch (err) {
      setError(extractError(err, "Erro ao alterar coordenador."));
    }
  }

  async function deleteTurma(id) {
    if (!window.confirm("Tens a certeza que queres apagar esta turma?")) return;

    setError("");
    setInfo("");
    try {
      await api.delete(`/Turmas/${id}`);
      setTurmas((prev) => prev.filter((t) => t.id !== id));
      setInfo("Turma apagada.");
      setTimeout(() => setInfo(""), 1200);
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
    setAssocForm({ moduloId: "", formadorId: "", sequencia: 1 });

    try {
      const [mRes, aRes] = await Promise.all([
        api.get("/Modulos"),
        api.get(`/Turmas/${turma.id}/modulos`),
      ]);
      setModulosDisponiveis(Array.isArray(mRes.data) ? mRes.data : []);
      setAssociados(Array.isArray(aRes.data) ? aRes.data : []);
    } catch (err) {
      setModError(extractError(err, "Erro ao carregar dados do modal."));
    } finally {
      setModLoading(false);
    }
  }

  function closeModulosModal() {
    if (modSaving) return;
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

    const payload = { TurmaId: turmaId, ModuloId: moduloId, FormadorId: formadorId, Sequencia: sequencia };

    setModSaving(true);
    try {
      await api.post("/Turmas/modulo", payload);
      await refreshAssociados(turmaId);
      setAssocForm((p) => ({ ...p, moduloId: "" }));
    } catch (err) {
      setModError(extractError(err, "Erro ao associar módulo."));
    } finally {
      setModSaving(false);
    }
  }

  async function removerAssociacao(turmaModuloId) {
    if (!window.confirm("Remover este módulo da turma?")) return;

    setModError("");
    try {
      await api.delete(`/Turmas/modulo/${turmaModuloId}`);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur-xl dark:bg-gray-900/90 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BurgerMenu />
            <HeaderIcon />
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Turmas</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gestão de turmas e associação de módulos.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <PrimaryBtn tone="blue" onClick={openCreate} disabled={loading}>
              + Nova Turma
            </PrimaryBtn>
            <Btn onClick={loadAll} disabled={loading}>
              Atualizar
            </Btn>
            <Btn onClick={() => navigate("/dashboard")}>← Voltar</Btn>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {(error || info) && (
          <div className="mb-6 space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 dark:bg-red-950/25 dark:border-red-900/40 rounded-xl p-4 text-sm text-red-700 dark:text-red-200">
                {error}
              </div>
            )}
            {info && (
              <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 rounded-xl p-4 text-sm text-emerald-800 dark:text-emerald-200">
                {info}
              </div>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por id, nome, curso, coordenador, local..."
              className="w-full lg:max-w-2xl px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800
                         bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Estado</span>
                <select
                  value={estadoFilter}
                  onChange={(e) => setEstadoFilter(e.target.value)}
                  className="border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 bg-white dark:bg-gray-900
                             text-gray-900 dark:text-gray-100 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="Todos">Todos</option>
                  {ESTADOS.map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </div>

              <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>

              {/* (opcional) se quiseres o "Atualizar" aqui como no print, descomenta e podes remover do header */}
              {/* <Btn onClick={loadAll} disabled={loading}>
                Atualizar
              </Btn> */}
            </div>
          </div>

          {/* Paginação compacta */}
          <div className="mt-4">
            <PaginationCompact
              total={filtered.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              disabled={loading}
            />
          </div>
        </div>

        {/* Separator */}
        <div className="my-6 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-600 dark:text-gray-300">A carregar...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-600 dark:text-gray-400">Sem turmas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-950/30">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs font-black text-gray-700 dark:text-gray-200">ID</th>
                    <th className="px-4 py-3 text-xs font-black text-gray-700 dark:text-gray-200">Nome</th>
                    <th className="px-4 py-3 text-xs font-black text-gray-700 dark:text-gray-200">Curso</th>
                    <th className="px-4 py-3 text-xs font-black text-gray-700 dark:text-gray-200">Coordenador</th>
                    <th className="px-4 py-3 text-xs font-black text-gray-700 dark:text-gray-200">Início</th>
                    <th className="px-4 py-3 text-xs font-black text-gray-700 dark:text-gray-200">Fim</th>
                    <th className="px-4 py-3 text-xs font-black text-gray-700 dark:text-gray-200">Local</th>
                    <th className="px-4 py-3 text-xs font-black text-gray-700 dark:text-gray-200">Estado</th>
                    <th className="px-4 py-3 text-xs font-black text-gray-700 dark:text-gray-200 text-right">Ações</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paged.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-semibold whitespace-nowrap">
                        {t.id}
                      </td>

                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-bold">{t.nome}</td>

                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {t.cursoNome || (t.cursoId ? `#${t.cursoId}` : "—")}
                      </td>

                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {editingCoordTurmaId === t.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              autoFocus
                              defaultValue={t.coordenadorId ?? ""}
                              onChange={(e) => {
                                const v = e.target.value;
                                updateCoordenador(t.id, v ? Number(v) : null);
                              }}
                              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500/40 focus:outline-none min-w-[180px]"
                            >
                              <option value="">Sem coordenador</option>
                              {formadores.map((f) => (
                                <option key={getFormadorId(f)} value={getFormadorId(f)}>
                                  {getFormadorDisplay(f)}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setEditingCoordTurmaId(null)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-bold"
                              title="Cancelar"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 group">
                            <span>{t.coordenadorNome || (t.coordenadorId ? `#${t.coordenadorId}` : "Sem coordenador")}</span>
                            <button
                              type="button"
                              onClick={() => setEditingCoordTurmaId(t.id)}
                              className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                              title="Alterar coordenador"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {toDateInputValue(t.dataInicio) || "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        {toDateInputValue(t.dataFim) || "—"}
                      </td>

                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.local || "—"}</td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold ${estadoColors[t.estado] || estadoColors.Planeada
                            }`}
                        >
                          {t.estado || "Planeada"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <Btn tone="blue" onClick={() => openModulosModal(t)}>
                            Módulos
                          </Btn>
                          <Btn tone="red" onClick={() => deleteTurma(t.id)}>
                            Apagar
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ✅ Paginação também no fundo (se não quiseres, apaga este bloco) */}
          {!loading && filtered.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-4 bg-white dark:bg-gray-900">
              <PaginationCompact
                total={filtered.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                disabled={loading}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal Create */}
      {showForm && (
        <Modal title="Nova Turma" onClose={closeForm} disabled={saving}>
          <form onSubmit={saveTurma} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Nome</label>
              <input
                name="nome"
                value={form.nome}
                onChange={onChange}
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                           bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Ex: TPSI 0525"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Curso</label>
              <select
                name="cursoId"
                value={form.cursoId}
                onChange={onChange}
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                           bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="">Seleciona um curso...</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                Coordenador (Formador)
              </label>
              <select
                name="coordenadorId"
                value={form.coordenadorId}
                onChange={onChange}
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                           bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="">Sem coordenador</option>
                {formadores.map((f) => (
                  <option key={getFormadorId(f)} value={getFormadorId(f)}>
                    {getFormadorDisplay(f)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Data início</label>
              <input
                type="date"
                name="dataInicio"
                value={form.dataInicio}
                onChange={onChange}
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                           bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Data fim</label>
              <input
                type="date"
                name="dataFim"
                value={form.dataFim}
                onChange={onChange}
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                           bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Local</label>
              <input
                name="local"
                value={form.local}
                onChange={onChange}
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                           bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Ex: ATEC"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Estado</label>
              <select
                name="estado"
                value={form.estado}
                onChange={onChange}
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                           bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                {ESTADOS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
              <Btn onClick={closeForm} disabled={saving}>
                Cancelar
              </Btn>
              <PrimaryBtn tone="blue" type="submit" disabled={saving}>
                {saving ? "A guardar..." : "Guardar"}
              </PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Turma -> Módulos */}
      {showModulos && selectedTurma && (
        <Modal title={`Módulos — ${selectedTurma.nome}`} onClose={closeModulosModal} disabled={modSaving}>
          {modError && (
            <div className="mb-4 bg-red-50 border border-red-200 dark:bg-red-950/25 dark:border-red-900/40 rounded-xl p-4 text-sm text-red-700 dark:text-red-200">
              {modError}
            </div>
          )}

          {modLoading ? (
            <div className="py-14 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-600 dark:text-gray-300">A carregar...</span>
            </div>
          ) : (
            <>
              <form
                onSubmit={associarModulo}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/15"
              >
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Módulo</label>
                  <select
                    value={assocForm.moduloId}
                    onChange={(e) => setAssocForm((p) => ({ ...p, moduloId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                               bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Formador</label>
                  <select
                    value={assocForm.formadorId}
                    onChange={(e) => setAssocForm((p) => ({ ...p, formadorId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                               bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 text-sm
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    disabled={modSaving}
                  >
                    <option value="">Seleciona...</option>
                    {formadores.map((f) => (
                      <option key={getFormadorId(f)} value={getFormadorId(f)}>
                        {getFormadorDisplay(f)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Sequência</label>
                  <input
                    type="number"
                    min="1"
                    value={assocForm.sequencia}
                    onChange={(e) => setAssocForm((p) => ({ ...p, sequencia: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                               bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    disabled={modSaving}
                  />

                  <PrimaryBtn type="submit" className="mt-3 w-full" disabled={modSaving}>
                    {modSaving ? "A associar..." : "+ Associar"}
                  </PrimaryBtn>
                </div>
              </form>

              <div className="bg-white dark:bg-gray-950/40 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                  <div className="font-black text-gray-900 dark:text-gray-100">
                    Módulos Associados ({associadosOrdenados.length})
                  </div>
                </div>

                {associadosOrdenados.length === 0 ? (
                  <div className="px-5 py-12 text-center text-gray-500 dark:text-gray-400">Nenhum módulo associado.</div>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
                        <tr className="text-left">
                          <th className="py-3 px-5 text-xs font-black text-gray-700 dark:text-gray-200">Seq</th>
                          <th className="py-3 px-5 text-xs font-black text-gray-700 dark:text-gray-200">Módulo</th>
                          <th className="py-3 px-5 text-xs font-black text-gray-700 dark:text-gray-200">Formador</th>
                          <th className="py-3 px-5 text-xs font-black text-gray-700 dark:text-gray-200">Ações</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {associadosOrdenados.map((tm) => (
                          <tr key={tm.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                            <td className="py-3 px-5 text-gray-600 dark:text-gray-400 font-mono">
                              #{tm.sequencia ?? "—"}
                            </td>
                            <td className="py-3 px-5 text-gray-900 dark:text-gray-100 font-semibold">
                              {tm.moduloNome || `#${tm.moduloId}`}
                            </td>
                            <td className="py-3 px-5 text-gray-700 dark:text-gray-300">
                              {tm.formadorNome || `#${tm.formadorId}`}
                            </td>
                            <td className="py-3 px-5">
                              <Btn tone="red" onClick={() => removerAssociacao(tm.id)} disabled={modSaving}>
                                Remover
                              </Btn>
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
