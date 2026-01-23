import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * VISUAL-FIRST:
 * - Por agora usa dados mock (sampleRooms).
 * - Quando o backend estiver pronto, trocamos por API:
 *   GET /Salas | POST /Salas | PUT /Salas/{id} | DELETE /Salas/{id}
 */

const sampleRooms = [
  {
    id: 1,
    nome: "Sala A1",
    codigo: "A1",
    edificio: "Bloco A",
    piso: "1",
    capacidade: 24,
    recursos: ["Projetor", "PCs"],
    estado: "Ativa",
    observacoes: "Boa para aulas práticas",
  },
  {
    id: 2,
    nome: "Sala B2",
    codigo: "B2",
    edificio: "Bloco B",
    piso: "2",
    capacidade: 16,
    recursos: ["Quadro", "Wi-Fi"],
    estado: "Manutenção",
    observacoes: "",
  },
  {
    id: 3,
    nome: "Auditório",
    codigo: "AUD",
    edificio: "Bloco Central",
    piso: "R/C",
    capacidade: 120,
    recursos: ["Som", "Projetor", "Microfone"],
    estado: "Ativa",
    observacoes: "Reservas com antecedência",
  },
];

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
            Fechar
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function BadgeEstado({ estado }) {
  const base =
    "text-xs font-semibold px-2.5 py-0.5 rounded inline-block";

  if (estado === "Ativa") {
    return (
      <span className={`${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200`}>
        Ativa
      </span>
    );
  }

  if (estado === "Inativa") {
    return (
      <span className={`${base} bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200`}>
        Inativa
      </span>
    );
  }

  // Manutenção ou outro
  return (
    <span className={`${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200`}>
      {estado}
    </span>
  );
}

export default function AdminSalas() {
  const navigate = useNavigate();

  const [salas, setSalas] = useState(sampleRooms);

  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("Todos");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    nome: "",
    codigo: "",
    edificio: "",
    piso: "",
    capacidade: 0,
    recursosText: "", // UI: lista separada por vírgulas
    estado: "Ativa",
    observacoes: "",
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    return salas.filter((r) => {
      const matchesSearch =
        !s ||
        (r.nome || "").toLowerCase().includes(s) ||
        (r.codigo || "").toLowerCase().includes(s) ||
        (r.edificio || "").toLowerCase().includes(s);

      const matchesEstado =
        estadoFilter === "Todos" ? true : r.estado === estadoFilter;

      return matchesSearch && matchesEstado;
    });
  }, [salas, search, estadoFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      nome: "",
      codigo: "",
      edificio: "",
      piso: "",
      capacidade: 0,
      recursosText: "",
      estado: "Ativa",
      observacoes: "",
    });
    setShowForm(true);
  }

  function openEdit(room) {
    setEditing(room);
    setForm({
      nome: room.nome ?? "",
      codigo: room.codigo ?? "",
      edificio: room.edificio ?? "",
      piso: room.piso ?? "",
      capacidade: Number(room.capacidade ?? 0),
      recursosText: (room.recursos ?? []).join(", "),
      estado: room.estado ?? "Ativa",
      observacoes: room.observacoes ?? "",
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  function saveRoom(e) {
    e.preventDefault();

    if (!form.nome.trim()) return alert("O nome da sala é obrigatório.");
    if (!form.codigo.trim()) return alert("O código da sala é obrigatório.");

    const recursos = form.recursosText
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

    const payload = {
      nome: form.nome.trim(),
      codigo: form.codigo.trim(),
      edificio: form.edificio.trim(),
      piso: form.piso.trim(),
      capacidade: Number(form.capacidade) || 0,
      recursos,
      estado: form.estado,
      observacoes: form.observacoes.trim(),
    };

    if (editing) {
      setSalas((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...payload } : r)));
    } else {
      const nextId = salas.length ? Math.max(...salas.map((r) => r.id)) + 1 : 1;
      setSalas((prev) => [{ id: nextId, ...payload }, ...prev]);
    }

    closeForm();
  }

  function deleteRoom(id) {
    if (!window.confirm("Tens a certeza que queres apagar esta sala?")) return;
    setSalas((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="container mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Salas</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gestão de salas (CRUD) — capacidade, recursos e estado.
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
              + Nova Sala
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
                placeholder="Pesquisar por nome, código ou edifício..."
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
                <option value="Ativa">Ativa</option>
                <option value="Inativa">Inativa</option>
                <option value="Manutenção">Manutenção</option>
              </select>

              <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                Total: <span className="font-semibold">{filtered.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
                <tr>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">ID</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Nome</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Código</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Edifício</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Piso</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Capacidade</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Recursos</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Estado</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Ações</th>
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                      Sem salas para mostrar.
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
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{r.codigo}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{r.edificio}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{r.piso}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">{r.capacidade}</td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {(r.recursos || []).length ? (
                          <div className="flex flex-wrap gap-1">
                            {r.recursos.map((x) => (
                              <span
                                key={`${r.id}-${x}`}
                                className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800
                                           dark:bg-blue-900/40 dark:text-blue-200"
                              >
                                {x}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <BadgeEstado estado={r.estado} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEdit(r)}
                            className="px-3 py-1.5 rounded text-sm font-medium text-yellow-700 hover:bg-yellow-50
                                       dark:text-yellow-300 dark:hover:bg-yellow-900/20"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => deleteRoom(r.id)}
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

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Nota: página em modo visual-first com dados mock. Quando o backend estiver pronto, ligamos à API.
        </div>
      </div>

      {/* Modal Create/Edit */}
      {showForm && (
        <Modal title={editing ? "Editar Sala" : "Nova Sala"} onClose={closeForm}>
          <form onSubmit={saveRoom} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Nome</label>
              <input
                name="nome"
                value={form.nome}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                placeholder="Ex: Sala A1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Código</label>
              <input
                name="codigo"
                value={form.codigo}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                placeholder="Ex: A1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Capacidade</label>
              <input
                type="number"
                name="capacidade"
                value={form.capacidade}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                min="0"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Edifício</label>
              <input
                name="edificio"
                value={form.edificio}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                placeholder="Ex: Bloco A"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Piso</label>
              <input
                name="piso"
                value={form.piso}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                placeholder="Ex: 1 / R/C"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Recursos (separados por vírgulas)
              </label>
              <input
                name="recursosText"
                value={form.recursosText}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                placeholder="Ex: Projetor, PCs, Quadro, Som"
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
              >
                <option value="Ativa">Ativa</option>
                <option value="Inativa">Inativa</option>
                <option value="Manutenção">Manutenção</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Observações</label>
              <textarea
                name="observacoes"
                value={form.observacoes}
                onChange={onChange}
                className="mt-1 w-full border rounded px-3 py-2 min-h-[90px]
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                placeholder="Notas internas..."
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeForm}
                className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50
                           dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Guardar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
