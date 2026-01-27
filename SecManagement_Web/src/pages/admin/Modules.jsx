import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded border text-gray-700 hover:bg-gray-50
                       dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
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

  // Alinhado à BD: Nome, CargaHoraria, Nivel
  const [form, setForm] = useState({
    nome: "",
    cargaHoraria: "",
    nivel: "",
  });

  async function loadModules() {
    setLoading(true);
    setError("");

    try {
      // se o teu endpoint for singular, muda para "/Modulo"
      const res = await api.get("/Modulos");
      setModules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Failed to load modules.";
      setError(typeof msg === "string" ? msg : "Failed to load modules.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadModules();
  }, []);

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

    if (!nome) return alert("Name is required.");
    if (!Number.isFinite(carga) || carga <= 0) return alert("Carga Horária must be > 0.");

    const payload = {
      nome,
      cargaHoraria: carga,
      nivel: nivel || null,
    };

    setSaving(true);
    try {
      // se o teu endpoint for singular, muda:
      // POST "/Modulo" | PUT `/Modulo/${editing.id}` | DELETE `/Modulo/${id}`
      if (editing) {
        await api.put(`/Modulos/${editing.id}`, payload);
      } else {
        await api.post("/Modulos", payload);
      }

      closeForm();
      await loadModules();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Failed to save module.";
      setError(typeof msg === "string" ? msg : "Failed to save module.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteModule(id) {
    if (!window.confirm("Are you sure you want to delete this module?")) return;

    setError("");
    try {
      await api.delete(`/Modulos/${id}`);
      setModules((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Failed to delete module.";
      setError(typeof msg === "string" ? msg : "Failed to delete module.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="container mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Modules</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Modules management (CRUD) connected to API.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50
                         dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Back
            </button>

            <button
              onClick={openCreate}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              + New Module
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
                placeholder="Search by name, hours or level..."
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
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">ID</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Name</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Hours</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Level</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                      No modules found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => (
                    <tr key={m.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{m.id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{m.nome}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{m.cargaHoraria}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{m.nivel || "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEdit(m)}
                            className="px-3 py-1.5 rounded text-sm font-medium text-yellow-700 hover:bg-yellow-50
                                       dark:text-yellow-300 dark:hover:bg-yellow-900/20"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteModule(m.id)}
                            className="px-3 py-1.5 rounded text-sm font-medium text-red-700 hover:bg-red-50
                                       dark:text-red-300 dark:hover:bg-red-900/20"
                          >
                            Delete
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
        <Modal title={editing ? "Edit Module" : "New Module"} onClose={closeForm}>
          <form onSubmit={saveModule} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
              <input
                name="nome"
                value={form.nome}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                placeholder="Ex: Programação"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Hours</label>
              <input
                type="number"
                name="cargaHoraria"
                value={form.cargaHoraria}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                min="1"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Level</label>
              <input
                name="nivel"
                value={form.nivel}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                placeholder="Ex: Nível 4"
                disabled={saving}
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50
                           dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
