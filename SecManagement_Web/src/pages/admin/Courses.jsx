import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import BurgerMenu from "../../components/BurgerMenu";

/* ---------------- small helpers ---------------- */

function safeStr(x) {
  return (x ?? "").toString();
}

function extractError(err, fallback = "Ocorreu um erro.") {
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

/* ---------------- icons (como nas Áreas) ---------------- */

function PageIcon() {
  return (
    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-lg shadow-purple-500/25">
      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 19.5V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v13.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M4 19.5c1-1 2.5-1.5 4-1.5h12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path d="M8 8h8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Icon({ name, className = "w-5 h-5" }) {
  switch (name) {
    case "search":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}

/* ---------------- pagination bar ---------------- */

function PaginationBar({ page, perPage, total, onPageChange, onPerPageChange, disabled }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(total, safePage * perPage);

  const MiniBtn = ({ children, ...props }) => (
    <button
      type="button"
      className={[
        "px-3 py-1.5 rounded-lg border text-sm font-semibold transition",
        "border-gray-200 text-gray-700 hover:bg-gray-50",
        "dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800",
        "active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
        props.className || "",
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-gray-600 dark:text-gray-300">
          Cursos{" "}
          <span className="font-bold text-gray-900 dark:text-gray-100">
            {from}–{to}
          </span>{" "}
          de <span className="font-bold text-gray-900 dark:text-gray-100">{total}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Por página</span>
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            disabled={disabled}
            className="border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900
                       text-gray-900 dark:text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-purple-500/30 disabled:opacity-60"
          >
            {[5, 10, 15, 25].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <MiniBtn onClick={() => onPageChange(1)} disabled={disabled || safePage === 1}>
          «
        </MiniBtn>
        <MiniBtn onClick={() => onPageChange(safePage - 1)} disabled={disabled || safePage === 1}>
          ‹
        </MiniBtn>

        <div className="text-sm text-gray-600 dark:text-gray-300 px-1">
          Página <span className="font-bold text-gray-900 dark:text-gray-100">{safePage}</span> /{" "}
          <span className="font-bold text-gray-900 dark:text-gray-100">{totalPages}</span>
        </div>

        <MiniBtn onClick={() => onPageChange(safePage + 1)} disabled={disabled || safePage === totalPages}>
          ›
        </MiniBtn>
        <MiniBtn onClick={() => onPageChange(totalPages)} disabled={disabled || safePage === totalPages}>
          »
        </MiniBtn>
      </div>
    </div>
  );
}

/* ---------------- modal ---------------- */

function Modal({ title, children, onClose, disabled }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !disabled && onClose()}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 rounded-t-2xl">
          <h3 className="font-black text-lg text-gray-900 dark:text-gray-100">{title}</h3>

          <button
            type="button"
            onClick={() => !disabled && onClose()}
            disabled={disabled}
            className="p-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition
                       dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-60"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function Courses() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [areas, setAreas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [areaFilter, setAreaFilter] = useState("all");

  // pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // form/modal
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nome: "", areaId: "", nivelCurso: "" });

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [cRes, aRes] = await Promise.all([api.get("/Cursos"), api.get("/Areas")]);
      setCourses(Array.isArray(cRes.data) ? cRes.data : []);
      setAreas(Array.isArray(aRes.data) ? aRes.data : []);
    } catch (e) {
      setError(extractError(e, "Falha ao carregar cursos/áreas."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return courses.filter((c) => {
      const nome = safeStr(c?.nome).toLowerCase();
      const nivel = safeStr(c?.nivelCurso).toLowerCase();

      // ✅ sem "local"
      const matchesQuery = !q || nome.includes(q) || nivel.includes(q);
      const matchesArea = areaFilter === "all" || String(c?.areaId) === String(areaFilter);

      return matchesQuery && matchesArea;
    });
  }, [courses, query, areaFilter]);

  const stats = useMemo(() => {
    const total = courses.length;
    const areasCount = new Set(courses.map((c) => c?.areaId).filter(Boolean)).size;
    return { total, areasCount };
  }, [courses]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => setPage(1), [query, areaFilter, perPage]);
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage]);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, safePage, perPage]);

  function openCreate() {
    setEditing(null);
    setForm({ nome: "", areaId: "", nivelCurso: "" });
    setError("");
    setShowForm(true);
  }

  function openEdit(course) {
    setEditing(course);
    setForm({
      nome: course?.nome || "",
      areaId: course?.areaId ?? "",
      nivelCurso: course?.nivelCurso || "",
    });
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function saveCourse(e) {
    e.preventDefault();
    setError("");

    const nome = form.nome.trim();
    const areaIdNum = Number(form.areaId);
    const nivelCurso = form.nivelCurso.trim();

    if (!nome) return alert("O nome é obrigatório.");
    if (!Number.isFinite(areaIdNum) || areaIdNum <= 0) return alert("A área é obrigatória.");

    // ✅ sem local
    const payload = {
      nome,
      areaId: areaIdNum,
      nivelCurso: nivelCurso || null,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/Cursos/${editing.id}`, payload);
      } else {
        await api.post("/Cursos", payload);
      }
      closeForm();
      await loadAll();
    } catch (e2) {
      setError(extractError(e2, "Falha ao guardar curso."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourse(id) {
    if (!window.confirm("Tens a certeza que queres apagar este curso?")) return;

    setError("");
    try {
      await api.delete(`/Cursos/${id}`);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(extractError(e, "Falha ao apagar curso."));
    }
  }

  // ✅ botão estilo antigo (pill) – para manter exatamente como estava
  const actionBtnBase =
    "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed";

  const editBtn =
    `${actionBtnBase} bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 ` +
    `dark:bg-amber-950/20 dark:text-amber-200 dark:border-amber-900/40 dark:hover:bg-amber-950/35`;

  const delBtn =
    `${actionBtnBase} bg-red-50 text-red-700 border-red-200 hover:bg-red-100 ` +
    `dark:bg-red-950/20 dark:text-red-200 dark:border-red-900/40 dark:hover:bg-red-950/35`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BurgerMenu />
            <PageIcon />
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Cursos</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gestão de cursos e programas de formação</p>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 rounded-lg border text-sm font-semibold transition
                         border-gray-200 text-gray-700 hover:bg-gray-50
                         dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 active:scale-95"
            >
              ← Voltar
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition
                         bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800
                         shadow-lg shadow-purple-500/25 hover:shadow-xl active:scale-95"
            >
              + Novo Curso
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Stats (sem “Locais”) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10 opacity-60" />
            <div className="relative">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Total de Cursos</div>
              <div className="text-2xl font-black text-gray-900 dark:text-gray-100">{stats.total}</div>
            </div>
          </div>

          <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10 opacity-60" />
            <div className="relative">
              <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Áreas Diferentes</div>
              <div className="text-2xl font-black text-gray-900 dark:text-gray-100">{stats.areasCount}</div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                <Icon name="search" className="w-5 h-5" />
              </span>

              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar por nome ou nível..."
                className="w-full border border-gray-200 dark:border-gray-800 rounded-lg pl-10 pr-4 py-2.5
                           bg-white dark:bg-gray-950
                           text-gray-900 dark:text-gray-100
                           placeholder:text-gray-400 dark:placeholder:text-gray-500
                           focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                className="border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2.5
                           bg-white dark:bg-gray-950
                           text-gray-900 dark:text-gray-100
                           text-sm font-semibold
                           focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              >
                <option value="all">Todas as áreas</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={loadAll}
                disabled={loading || saving}
                className="px-4 py-2 rounded-lg border text-sm font-semibold transition
                           border-gray-200 text-gray-700 hover:bg-gray-50
                           dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800
                           active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Atualizar
              </button>
            </div>
          </div>

          <div className="mt-4">
            <PaginationBar
              page={safePage}
              perPage={perPage}
              total={total}
              onPageChange={setPage}
              onPerPageChange={(n) => {
                setPerPage(n);
                setPage(1);
              }}
              disabled={loading || saving}
            />
          </div>
        </div>

        {error && (
          <div className="mb-5 bg-red-50 border border-red-200 dark:bg-red-950/25 dark:border-red-900/40 rounded-xl p-4 text-sm text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 dark:bg-gray-950/30 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="text-left text-xs font-black text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">ID</th>
                  <th className="text-left text-xs font-black text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Nome</th>
                  <th className="text-left text-xs font-black text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Área</th>
                  <th className="text-left text-xs font-black text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Nível</th>
                  <th className="text-left text-xs font-black text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-16 px-6">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-600 dark:text-gray-300 font-semibold">A carregar cursos...</span>
                      </div>
                    </td>
                  </tr>
                ) : total === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-16 px-6">
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-600 dark:text-gray-300">
                        <div className="font-semibold">Sem cursos encontrados</div>
                        <button
                          type="button"
                          onClick={openCreate}
                          className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition
                                     bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800
                                     shadow-lg shadow-purple-500/25 hover:shadow-xl active:scale-95"
                          disabled={saving}
                        >
                          + Criar primeiro curso
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pageItems.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-4 px-6">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">#{c.id}</span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm">
                            {(c.nome || "?")[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{c.nome}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
                                         bg-blue-100 text-blue-700 border border-blue-200
                                         dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                          {c.areaNome ?? c.area?.nome ?? `#${c.areaId ?? "—"}`}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">{c.nivelCurso || "—"}</td>

                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => openEdit(c)} disabled={saving} className={editBtn}>
                            <span aria-hidden="true">✏️</span> Editar
                          </button>

                          <button type="button" onClick={() => deleteCourse(c.id)} disabled={saving} className={delBtn}>
                            <span aria-hidden="true">🗑️</span> Apagar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && total > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-50/60 dark:bg-gray-950/20">
              <PaginationBar
                page={safePage}
                perPage={perPage}
                total={total}
                onPageChange={setPage}
                onPerPageChange={(n) => {
                  setPerPage(n);
                  setPage(1);
                }}
                disabled={saving}
              />
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <Modal title={editing ? "Editar Curso" : "Novo Curso"} onClose={closeForm} disabled={saving}>
          <form onSubmit={saveCourse} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nome</label>
                <input
                  name="nome"
                  value={form.nome}
                  onChange={onChange}
                  className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950
                             text-gray-900 dark:text-gray-100
                             placeholder:text-gray-400 dark:placeholder:text-gray-500
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  placeholder="Ex: Desenvolvimento Web"
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Área</label>
                <select
                  name="areaId"
                  value={form.areaId}
                  onChange={onChange}
                  className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950
                             text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  disabled={saving}
                >
                  <option value="">Seleciona uma área...</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nível</label>
                <input
                  name="nivelCurso"
                  value={form.nivelCurso}
                  onChange={onChange}
                  className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950
                             text-gray-900 dark:text-gray-100
                             placeholder:text-gray-400 dark:placeholder:text-gray-500
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  placeholder="Ex: 4"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="px-4 py-2 rounded-lg border text-sm font-semibold transition
                           border-gray-200 text-gray-700 hover:bg-gray-50
                           dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800
                           active:scale-95 disabled:opacity-60"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition
                           bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800
                           shadow-lg shadow-purple-500/25 hover:shadow-xl active:scale-95 disabled:opacity-60"
              >
                {saving ? "A guardar..." : editing ? "Guardar" : "Criar"}
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 dark:bg-red-950/25 dark:border-red-900/40 rounded-xl p-4 text-sm text-red-700 dark:text-red-200">
                {error}
              </div>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}
