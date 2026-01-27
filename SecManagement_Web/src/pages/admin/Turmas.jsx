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

const ESTADOS = ["Planeada", "Decorrer", "Terminada", "Cancelada"];

function toDateInputValue(dateLike) {
  if (!dateLike) return "";
  return String(dateLike).slice(0, 10);
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
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    nome: "",
    cursoId: "",
    dataInicio: "",
    dataFim: "",
    local: "",
    // UI apenas (backend ainda não recebe estado no CreateTurmaDto atual)
    estado: "Planeada",
  });

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [tRes, cRes] = await Promise.all([api.get("/Turmas"), api.get("/Cursos")]);
      setTurmas(Array.isArray(tRes.data) ? tRes.data : []);
      setCursos(Array.isArray(cRes.data) ? cRes.data : []);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Failed to load data.";
      setError(typeof msg === "string" ? msg : "Failed to load data.");
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

      const matchesEstado = estadoFilter === "Todos" ? true : (t.estado === estadoFilter);

      return matchesSearch && matchesEstado;
    });
  }, [turmas, search, estadoFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      nome: "",
      cursoId: "",
      dataInicio: "",
      dataFim: "",
      local: "",
      estado: "Planeada", // UI default
    });
    setShowForm(true);
  }

  function openEdit(turma) {
    setEditing(turma);
    setForm({
      nome: turma.nome ?? "",
      cursoId: String(turma.cursoId ?? ""),
      dataInicio: toDateInputValue(turma.dataInicio),
      dataFim: toDateInputValue(turma.dataFim),
      local: turma.local ?? "",
      // UI: mostra o estado atual (vem no TurmaDto)
      estado: turma.estado ?? "Planeada",
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

  async function saveTurma(e) {
    e.preventDefault();
    setError("");

    const nome = form.nome.trim();
    const cursoIdNum = Number(form.cursoId);
    const local = form.local.trim();

    if (!nome) return alert("Name is required.");
    if (!Number.isFinite(cursoIdNum) || cursoIdNum <= 0) return alert("Course is required.");

    // ✅ Com o DTO atual, DataInicio e DataFim são DateTime (obrigatórios)
    if (!form.dataInicio) return alert("Start date is required.");
    if (!form.dataFim) return alert("End date is required.");

    const dataInicio = `${form.dataInicio}T00:00:00`;
    const dataFim = `${form.dataFim}T00:00:00`;

    if (new Date(dataFim) < new Date(dataInicio)) {
      return alert("End date cannot be before start date.");
    }

    // ✅ Payload 100% compatível com CreateTurmaDto atual (SEM estado)
    const payload = {
      nome,
      cursoId: cursoIdNum,
      dataInicio,
      dataFim,
      local: local || "",
    };

    setSaving(true);
    try {
      if (editing) {
        // ⚠️ Só funciona se tiveres PUT no backend
        await api.put(`/Turmas/${editing.id}`, payload);
      } else {
        await api.post("/Turmas", payload);
      }

      closeForm();
      await loadAll();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Failed to save class.";
      setError(typeof msg === "string" ? msg : "Failed to save class.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTurma(id) {
    if (!window.confirm("Are you sure you want to delete this class?")) return;

    setError("");
    try {
      await api.delete(`/Turmas/${id}`);
      setTurmas((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Failed to delete class.";
      setError(typeof msg === "string" ? msg : "Failed to delete class.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="container mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Classes (Turmas)</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Classes management (CRUD) connected to API.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50
                         dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Back
            </button>

            <button onClick={openCreate} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700">
              + New Class
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm p-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
            <div className="flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, course, location or id..."
                className="w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
              >
                <option value="Todos">All</option>
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
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Course</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Start</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">End</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Location</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Status</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                      No classes found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((t) => (
                    <tr key={t.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                      <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{t.id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{t.nome}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {t.cursoNome ?? `#${t.cursoId ?? "—"}`}
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
                            onClick={() => openEdit(t)}
                            className="px-3 py-1.5 rounded text-sm font-medium text-yellow-700 hover:bg-yellow-50
                                       dark:text-yellow-300 dark:hover:bg-yellow-900/20"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteTurma(t.id)}
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
        <Modal title={editing ? "Edit Class" : "New Class"} onClose={closeForm}>
          <form onSubmit={saveTurma} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
              <input
                name="nome"
                value={form.nome}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                disabled={saving}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Course</label>
              <select
                name="cursoId"
                value={form.cursoId}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                disabled={saving}
              >
                <option value="">Select course...</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Start Date</label>
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">End Date</label>
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
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Location</label>
              <input
                name="local"
                value={form.local}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                disabled={saving}
              />
            </div>

            {/* UI only (backend ainda não aceita no CreateTurmaDto atual) */}
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Status</label>
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
                Nota: o backend ainda não recebe Estado no CreateTurmaDto, por isso este campo só vai funcionar
                depois de atualizares o DTO/service.
              </p>
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
