import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";


function Modal({ title, children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
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

export default function AdminCourses() {
  const navigate = useNavigate();

  // Data from API
  const [courses, setCourses] = useState([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // Form matches CreateCursoDto
  const [form, setForm] = useState({
    nome: "",
    area: "",
    dataInicio: "",
    dataFim: "",
  });

  async function loadCourses() {
    setLoading(true);
    setError("");

    try {
      // axios baseURL already includes /api
      const res = await api.get("/Curso");
      setCourses(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return courses;

    return courses.filter((c) => {
      return (
        (c.nome || "").toLowerCase().includes(s) ||
        (c.area || "").toLowerCase().includes(s) ||
        (c.isAtivo ? "active" : "inactive").includes(s)
      );
    });
  }, [courses, search]);

  function openCreate() {
    setEditing(null);
    setForm({ nome: "", area: "", dataInicio: "", dataFim: "" });
    setShowForm(true);
  }

  function openEdit(course) {
    setEditing(course);

    setForm({
      nome: course.nome ?? "",
      area: course.area ?? "",
      dataInicio: (course.dataInicio ?? "").slice(0, 10),
      dataFim: (course.dataFim ?? "").slice(0, 10),
    });

    setShowForm(true);
  }

  function closeForm() {
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

    if (!form.nome.trim()) return alert("Course name is required.");
    if (!form.area.trim()) return alert("Area is required.");

    // Payload for CreateCursoDto
    const payload = {
      nome: form.nome.trim(),
      area: form.area.trim(),
      dataInicio: form.dataInicio || null,
      dataFim: form.dataFim || null,
    };

    try {
      if (editing) {
        await api.put(`/Curso/${editing.id}`, payload);
      } else {
        await api.post("/Curso", payload);
      }

      closeForm();
      await loadCourses();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save course.");
    }
  }

  async function deleteCourse(id) {
    if (!window.confirm("Are you sure you want to delete this course?")) return;

    try {
      await api.delete(`/Curso/${id}`);
      await loadCourses();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete course.");
    }
  }

  function renderStatusBadge(isAtivo) {
    const label = isAtivo ? "Active" : "Inactive";

    return (
      <span
        className="text-xs font-semibold px-2.5 py-0.5 rounded
                   bg-blue-100 text-blue-800
                   dark:bg-blue-900/40 dark:text-blue-200"
      >
        {label}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="container mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Courses</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Courses management (CRUD) connected to API.
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
              + New Course
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
                placeholder="Search by name, area or status..."
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

        {/* Loading / Error */}
        {loading && (
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm p-4 mb-4">
            <div className="text-sm text-gray-700 dark:text-gray-300">Loading...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        {!loading && (
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-auto">
              <table className="min-w-full">
                <thead className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
                  <tr>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">ID</th>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Name</th>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Area</th>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Start</th>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">End</th>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Status</th>
                    <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                        No courses found.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                      >
                        <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{c.id}</td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 font-medium">{c.nome}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{c.area}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {(c.dataInicio ?? "").slice(0, 10)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {(c.dataFim ?? "").slice(0, 10)}
                        </td>
                        <td className="py-3 px-4">{renderStatusBadge(c.isAtivo)}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => navigate(`/dashboard/courses/${c.id}/modules`)}
                              className="px-3 py-1.5 rounded border text-sm text-gray-700 hover:bg-gray-50
                                         dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
                            >
                              Modules
                            </button>

                            <button
                              onClick={() => openEdit(c)}
                              className="px-3 py-1.5 rounded text-sm font-medium text-yellow-700 hover:bg-yellow-50
                                         dark:text-yellow-300 dark:hover:bg-yellow-900/20"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() => deleteCourse(c.id)}
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
        )}
      </div>

      {/* Modal Create/Edit */}
      {showForm && (
        <Modal title={editing ? "Edit Course" : "New Course"} onClose={closeForm}>
          <form onSubmit={saveCourse} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Name</label>
              <input
                name="nome"
                value={form.nome}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                placeholder="Ex: TPSI 0525"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Area</label>
              <input
                name="area"
                value={form.area}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                placeholder="Ex: Software"
              />
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
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50
                           dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
