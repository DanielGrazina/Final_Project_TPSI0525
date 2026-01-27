import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

function Modal({ title, children, onClose, disabled }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => !disabled && onClose()}
    >
      <div
        className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            disabled={disabled}
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

export default function AdminAreas() {
  const navigate = useNavigate();

  const [areas, setAreas] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({ nome: "" });

  async function loadAreas() {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/Areas");
      setAreas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Falha ao carregar áreas.";
      setError(typeof msg === "string" ? msg : "Falha ao carregar áreas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAreas();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return areas;

    return areas.filter((a) => {
      return (
        String(a.id ?? "").includes(s) ||
        (a.nome || "").toLowerCase().includes(s)
      );
    });
  }, [areas, search]);

  function openCreate() {
    setEditing(null);
    setForm({ nome: "" });
    setShowForm(true);
  }

  function openEdit(area) {
    setEditing(area);
    setForm({ nome: area.nome ?? "" });
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

  async function saveArea(e) {
    e.preventDefault();
    setError("");

    const nome = form.nome.trim();
    if (!nome) return alert("O nome da área é obrigatório.");

    setSaving(true);
    try {
      if (editing) {
        // PUT /Areas/{id}
        await api.put(`/Areas/${editing.id}`, { nome });
      } else {
        // POST /Areas
        await api.post("/Areas", { nome });
      }

      closeForm();
      await loadAreas();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Falha ao guardar área.";
      setError(typeof msg === "string" ? msg : "Falha ao guardar área.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteArea(id) {
    if (!window.confirm("Tens a certeza que queres apagar esta área?")) return;

    setError("");
    try {
      await api.delete(`/Areas/${id}`);
      setAreas((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Falha ao apagar área.";
      setError(typeof msg === "string" ? msg : "Falha ao apagar área.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="container mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Áreas</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gestão de áreas (CRUD) ligada à API.
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
              + Nova Área
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm p-4 mb-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div className="flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por id ou nome..."
                className="w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              />
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total: <span className="font-semibold">{filtered.length}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
                <tr>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">
                    ID
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">
                    Nome
                  </th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="3" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                      A carregar...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                      Sem áreas.
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{a.id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {a.nome}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEdit(a)}
                            className="px-3 py-1.5 rounded text-sm font-medium text-yellow-700 hover:bg-yellow-50
                                       dark:text-yellow-300 dark:hover:bg-yellow-900/20"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => deleteArea(a.id)}
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

      {showForm && (
        <Modal
          title={editing ? "Editar Área" : "Nova Área"}
          onClose={closeForm}
          disabled={saving}
        >
          <form onSubmit={saveArea} className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Nome</label>
              <input
                name="nome"
                value={form.nome}
                onChange={onChange}
                disabled={saving}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 disabled:opacity-60"
                placeholder="Ex: Software, Redes, Multimédia..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-60
                           dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
