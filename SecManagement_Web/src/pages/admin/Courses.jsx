import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border dark:border-gray-800 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800 bg-gradient-to-r from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-t-2xl">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-lg border hover:bg-gray-100 transition-colors
                       dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "blue" }) {
  const colors = {
    blue: "from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10 text-blue-600 dark:text-blue-400",
    purple: "from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10 text-purple-600 dark:text-purple-400",
    green: "from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10 text-green-600 dark:text-green-400",
  };

  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4">
      <div className={`absolute inset-0 bg-gradient-to-br ${colors[color]} opacity-50`} />
      <div className="relative">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      </div>
    </div>
  );
}

export default function AdminCourses() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [areas, setAreas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    nome: "",
    areaId: "",
    nivelCurso: "",
    local: "",
  });

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [cRes, aRes] = await Promise.all([
        api.get("/Cursos"),
        api.get("/Areas"),
      ]);

      setCourses(Array.isArray(cRes.data) ? cRes.data : []);
      setAreas(Array.isArray(aRes.data) ? aRes.data : []);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Falha ao carregar dados.";
      setError(typeof msg === "string" ? msg : "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const stats = useMemo(() => {
    const total = courses.length;
    const areasCount = new Set(courses.map(c => c.areaId)).size;
    const locations = new Set(courses.map(c => c.local).filter(Boolean)).size;
    
    return { total, areasCount, locations };
  }, [courses]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return courses;

    return courses.filter((c) => {
      const areaText = (c.areaNome ?? c.area?.nome ?? "").toLowerCase();
      return (
        (c.nome || "").toLowerCase().includes(s) ||
        areaText.includes(s) ||
        (c.nivelCurso || "").toLowerCase().includes(s) ||
        (c.local || "").toLowerCase().includes(s)
      );
    });
  }, [courses, search]);

  function openCreate() {
    setEditing(null);
    setForm({ nome: "", areaId: "", nivelCurso: "", local: "" });
    setShowForm(true);
  }

  function openEdit(course) {
    setEditing(course);
    setForm({
      nome: course.nome ?? "",
      areaId: String(course.areaId ?? ""),
      nivelCurso: course.nivelCurso ?? "",
      local: course.local ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function saveCourse(e) {
    e.preventDefault();
    setError("");

    const nome = form.nome.trim();
    const areaIdNum = Number(form.areaId);
    const nivelCurso = form.nivelCurso.trim();
    const local = form.local.trim();

    if (!nome) return alert("O nome é obrigatório.");
    if (!Number.isFinite(areaIdNum) || areaIdNum <= 0) return alert("A área é obrigatória.");

    const payload = {
      nome,
      areaId: areaIdNum,
      nivelCurso: nivelCurso || null,
      local: local || null,
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
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Falha ao guardar curso.";
      setError(typeof msg === "string" ? msg : "Falha ao guardar curso.");
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
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Falha ao apagar curso.";
      setError(typeof msg === "string" ? msg : "Falha ao apagar curso.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl dark:bg-gray-900/90 border-b dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Cursos</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gestão de cursos e programas de formação
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded-lg border hover:bg-gray-100 transition-colors
                           dark:border-gray-700 dark:hover:bg-gray-800"
              >
                ← Voltar
              </button>

              <button
                onClick={openCreate}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium
                           hover:from-purple-700 hover:to-purple-800 transition-all
                           shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40
                           active:scale-95"
              >
                + Novo Curso
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total de Cursos" value={stats.total} color="purple" />
          <StatCard label="Áreas Diferentes" value={stats.areasCount} color="blue" />
          <StatCard label="Locais" value={stats.locations} color="green" />
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome, área, nível ou local..."
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg
                           bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-shadow"
              />
            </div>

            <div className="px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border-b dark:border-gray-700">
                <tr>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">ID</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Nome</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Área</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Nível</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Local</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-16 px-6">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-500 dark:text-gray-400">A carregar cursos...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 px-6">
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
                        <svg className="w-16 h-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span>Sem cursos encontrados</span>
                        <button
                          onClick={openCreate}
                          className="mt-2 px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition-colors text-sm"
                        >
                          Criar primeiro curso
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">#{c.id}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {(c.nome || "?")[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{c.nome}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                          {c.areaNome ?? c.area?.nome ?? `#${c.areaId ?? "—"}`}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">{c.nivelCurso || "—"}</td>
                      <td className="py-4 px-6">
                        {c.local ? (
                          <div className="flex items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300">
                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {c.local}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEdit(c)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium
                                       bg-amber-100 text-amber-700 hover:bg-amber-200
                                       dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50
                                       transition-colors"
                          >
                            ✏ Editar
                          </button>
                          <button
                            onClick={() => deleteCourse(c.id)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium
                                       bg-red-100 text-red-700 hover:bg-red-200
                                       dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50
                                       transition-colors"
                          >
                            🗑 Apagar
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

      {showForm && (
        <Modal title={editing ? "Editar Curso" : "Novo Curso"} onClose={closeForm}>
          <form onSubmit={saveCourse} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Curso
                </label>
                <input
                  name="nome"
                  value={form.nome}
                  onChange={onChange}
                  className="w-full border rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950 dark:border-gray-800
                             text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  placeholder="Ex: TPSI 0525"
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Área de Formação
                </label>
                <select
                  name="areaId"
                  value={form.areaId}
                  onChange={onChange}
                  className="w-full border rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950 dark:border-gray-800
                             text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  disabled={saving}
                >
                  <option value="">Selecionar área...</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nível do Curso
                </label>
                <input
                  name="nivelCurso"
                  value={form.nivelCurso}
                  onChange={onChange}
                  className="w-full border rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950 dark:border-gray-800
                             text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  placeholder="Ex: Nível 4"
                  disabled={saving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Local
                </label>
                <input
                  name="local"
                  value={form.local}
                  onChange={onChange}
                  className="w-full border rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950 dark:border-gray-800
                             text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  placeholder="Ex: ATEC"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-800">
              <button
                type="button"
                onClick={closeForm}
                className="px-5 py-2.5 rounded-lg border hover:bg-gray-100 transition-colors
                           dark:border-gray-700 dark:hover:bg-gray-800"
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-700 text-white font-medium
                           hover:from-purple-700 hover:to-purple-800 transition-all
                           shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40
                           disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    A guardar...
                  </span>
                ) : (
                  "Guardar"
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}