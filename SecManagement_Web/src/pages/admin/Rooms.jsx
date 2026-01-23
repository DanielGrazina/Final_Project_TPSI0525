import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios"; // ajusta o path se estiver diferente

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded border text-gray-700 hover:bg-gray-50
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

const TIPOS = ["Teorica", "Informatica", "Oficina", "Reuniao"];

export default function AdminSalas() {
  const navigate = useNavigate();

  const [salas, setSalas] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    nome: "",
    capacidade: 1,
    tipo: "Teorica",
  });

  useEffect(() => {
    loadSalas();
  }, []);

  async function loadSalas() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/Salas");
      setSalas(res.data || []);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || "Falha ao carregar salas.";
      setError(typeof msg === "string" ? msg : "Falha ao carregar salas.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return salas;

    return salas.filter((r) => {
      return (
        String(r.id).includes(s) ||
        (r.nome || "").toLowerCase().includes(s) ||
        (r.tipo || "").toLowerCase().includes(s) ||
        String(r.capacidade ?? "").includes(s)
      );
    });
  }, [salas, search]);

  function openCreate() {
    setEditing(null);
    setForm({ nome: "", capacidade: 1, tipo: "Teorica" });
    setShowForm(true);
  }

  function openEdit(sala) {
    setEditing(sala);
    setForm({
      nome: sala.nome ?? "",
      capacidade: Number(sala.capacidade ?? 1),
      tipo: sala.tipo ?? "Teorica",
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

  async function saveSala(e) {
    e.preventDefault();
    setError("");

    const nome = form.nome.trim();
    const capacidade = Number(form.capacidade);
    const tipo = form.tipo;

    if (!nome) return alert("O nome da sala é obrigatório.");
    if (!Number.isFinite(capacidade) || capacidade < 1) return alert("Capacidade tem de ser >= 1.");
    if (!TIPOS.includes(tipo)) return alert("Tipo inválido.");

    const payload = { nome, capacidade, tipo };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`/Salas/${editing.id}`, payload);
      } else {
        await api.post("/Salas", payload);
      }

      await loadSalas();
      setShowForm(false);
      setEditing(null);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || "Erro ao guardar sala.";
      setError(typeof msg === "string" ? msg : "Erro ao guardar sala.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSala(id) {
    if (!window.confirm("Tens a certeza que queres apagar esta sala?")) return;

    setError("");
    try {
      await api.delete(`/Salas/${id}`);
      setSalas((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.response?.data || "Erro ao apagar sala.";
      setError(typeof msg === "string" ? msg : "Erro ao apagar sala.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="container mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Rooms</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Rooms management (CRUD) connected to API.
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
              + New Room
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
                placeholder="Search by id, name, capacity or type..."
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
          <div className="mb-4 bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded text-sm">
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
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Name</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Type</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Capacity</th>
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
                      No rooms found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{r.id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{r.nome}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{r.tipo}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{r.capacidade}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEdit(r)}
                            className="px-3 py-1.5 rounded text-sm font-medium text-yellow-700 hover:bg-yellow-50
                                       dark:text-yellow-300 dark:hover:bg-yellow-900/20"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteSala(r.id)}
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

      {/* Modal Create/Edit */}
      {showForm && (
        <Modal title={editing ? "Edit Room" : "New Room"} onClose={closeForm}>
          <form onSubmit={saveSala} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
              <input
                name="nome"
                value={form.nome}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                placeholder="Ex: Sala A1"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Type</label>
              <select
                name="tipo"
                value={form.tipo}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                disabled={saving}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Valores válidos na BD: Teorica, Informatica, Oficina, Reuniao
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Capacity</label>
              <input
                type="number"
                name="capacidade"
                value={form.capacidade}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                min="1"
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
