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
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800 bg-gradient-to-r from-cyan-50/50 to-blue-50/50 dark:from-cyan-950/20 dark:to-blue-950/20 rounded-t-2xl">
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

export default function AdminModules() {
  const navigate = useNavigate();

  const [modules, setModules] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    nome: "",
    cargaHoraria: "",
    nivel: "",
  });

  async function loadModules() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/Modulos");
      setModules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Falha ao carregar módulos.";
      setError(typeof msg === "string" ? msg : "Falha ao carregar módulos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModules();
  }, []);

  const stats = useMemo(() => {
    const total = modules.length;
    const totalHoras = modules.reduce((sum, m) => sum + (Number(m.cargaHoraria) || 0), 0);
    const niveis = new Set(modules.map(m => m.nivel).filter(Boolean)).size;
    
    return { total, totalHoras, niveis };
  }, [modules]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return modules;

    return modules.filter((m) => {
      return (
        (m.nome || "").toLowerCase().includes(s) ||
        String(m.cargaHoraria ?? "").toLowerCase().includes(s) ||
        (m.nivel || "").toLowerCase().includes(s)
      );
    });
  }, [modules, search]);

  function openCreate() {
    setEditing(null);
    setForm({ nome: "", cargaHoraria: "", nivel: "" });
    setShowForm(true);
  }

  function openEdit(modulo) {
    setEditing(modulo);
    setForm({
      nome: modulo.nome ?? "",
      cargaHoraria: String(modulo.cargaHoraria ?? ""),
      nivel: modulo.nivel ?? "",
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

  async function saveModule(e) {
    e.preventDefault();
    setError("");

    const nome = form.nome.trim();
    const carga = Number(form.cargaHoraria);
    const nivel = form.nivel.trim();

    if (!nome) return alert("O nome é obrigatório.");
    if (!Number.isFinite(carga) || carga <= 0) return alert("A carga horária deve ser maior que 0.");

    const payload = {
      nome,
      cargaHoraria: carga,
      nivel: nivel || null,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/Modulos/${editing.id}`, payload);
      } else {
        await api.post("/Modulos", payload);
      }

      closeForm();
      await loadModules();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Falha ao guardar módulo.";
      setError(typeof msg === "string" ? msg : "Falha ao guardar módulo.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteModule(id) {
    if (!window.confirm("Tens a certeza que queres apagar este módulo?")) return;

    setError("");
    try {
      await api.delete(`/Modulos/${id}`);
      setModules((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Falha ao apagar módulo.";
      setError(typeof msg === "string" ? msg : "Falha ao apagar módulo.");
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
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Módulos</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gestão do catálogo de módulos formativos
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
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium
                           hover:from-cyan-700 hover:to-blue-700 transition-all
                           shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40
                           active:scale-95"
              >
                + Novo Módulo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 dark:from-cyan-500/20 dark:to-cyan-600/10 opacity-50" />
            <div className="relative">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total de Módulos</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10 opacity-50" />
            <div className="relative">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total de Horas</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.totalHoras}h</div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10 opacity-50" />
            <div className="relative">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Níveis Diferentes</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.niveis}</div>
            </div>
          </div>
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
                placeholder="Pesquisar por nome, horas ou nível..."
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg
                           bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-shadow"
              />
            </div>

            <div className="px-3 py-2 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900/50">
              <span className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
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
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Carga Horária</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Nível</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-16 px-6">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-500 dark:text-gray-400">A carregar módulos...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-16 px-6">
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
                        <svg className="w-16 h-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <span>Sem módulos encontrados</span>
                        <button
                          onClick={openCreate}
                          className="mt-2 px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 transition-colors text-sm"
                        >
                          Criar primeiro módulo
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">#{m.id}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {(m.nome || "?")[0].toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{m.nome}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {m.cargaHoraria}h
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                        {m.nivel || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEdit(m)}
                            className="px-3 py-1.5 rounded-lg text-sm font-medium
                                       bg-amber-100 text-amber-700 hover:bg-amber-200
                                       dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50
                                       transition-colors"
                          >
                            ✏ Editar
                          </button>

                          <button
                            onClick={() => deleteModule(m.id)}
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
        <Modal title={editing ? "Editar Módulo" : "Novo Módulo"} onClose={closeForm}>
          <form onSubmit={saveModule} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nome do Módulo
                </label>
                <input
                  name="nome"
                  value={form.nome}
                  onChange={onChange}
                  className="w-full border rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950 dark:border-gray-800
                             text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Ex: Programação"
                  disabled={saving}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Carga Horária
                </label>
                <input
                  type="number"
                  name="cargaHoraria"
                  value={form.cargaHoraria}
                  onChange={onChange}
                  className="w-full border rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950 dark:border-gray-800
                             text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  min="1"
                  disabled={saving}
                  placeholder="Ex: 50"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Número de horas do módulo</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nível
                </label>
                <input
                  name="nivel"
                  value={form.nivel}
                  onChange={onChange}
                  className="w-full border rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950 dark:border-gray-800
                             text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  placeholder="Ex: Nível 4"
                  disabled={saving}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Opcional</p>
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
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium
                           hover:from-cyan-700 hover:to-blue-700 transition-all
                           shadow-lg shadow-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/40
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