// src/pages/admin/Salas.jsx
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

/* ---------------- UI ---------------- */

function Modal({ title, children, onClose, disabled }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !disabled && onClose()}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                       hover:bg-white dark:hover:bg-gray-800 transition-all duration-200 font-medium text-sm
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Fechar
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Pagination (compact like Turmas) ---------------- */

function PaginationCompact({ total, page, pageSize, onPageChange, disabled, className = "" }) {
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
      <button
        type="button"
        className={btn}
        onClick={() => onPageChange(safePage - 1)}
        disabled={disabled || safePage === 1}
      >
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

      <button
        type="button"
        className={btn}
        onClick={() => onPageChange(safePage + 1)}
        disabled={disabled || safePage === totalPages}
      >
        ›
      </button>
      <button
        type="button"
        className={btn}
        onClick={() => onPageChange(totalPages)}
        disabled={disabled || safePage === totalPages}
      >
        »
      </button>
    </div>
  );
}

/* ---------------- domain ---------------- */

const TIPOS = ["Teorica", "Informatica", "Oficina", "Reuniao"];

const tipoColors = {
  Teorica: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Informatica: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Oficina: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Reuniao: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const tipoIcons = {
  Teorica: "📖",
  Informatica: "💻",
  Oficina: "🔧",
  Reuniao: "👥",
};

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

  // pagination (igual ao Turmas)
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  useEffect(() => {
    loadSalas();
  }, []);

  async function loadSalas() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/Salas");
      setSalas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(extractError(err, "Falha ao carregar salas."));
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return salas;

    return (salas || []).filter((r) => {
      return (
        safeStr(r.id).includes(s) ||
        safeStr(r.nome).toLowerCase().includes(s) ||
        safeStr(r.tipo).toLowerCase().includes(s) ||
        safeStr(r.capacidade).includes(s)
      );
    });
  }, [salas, search]);

  // reset page when filters change
  useEffect(() => setPage(1), [search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / pageSize)),
    [filtered.length, pageSize]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  function openCreate() {
    setEditing(null);
    setForm({ nome: "", capacidade: 1, tipo: "Teorica" });
    setError("");
    setShowForm(true);
  }

  function openEdit(sala) {
    setEditing(sala);
    setForm({
      nome: sala?.nome ?? "",
      capacidade: Number(sala?.capacidade ?? 1),
      tipo: sala?.tipo ?? "Teorica",
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
    setForm((p) => ({ ...p, [name]: value }));
  }

  async function saveSala(e) {
    e.preventDefault();
    setError("");

    const nome = safeStr(form.nome).trim();
    const capacidade = Number(form.capacidade);
    const tipo = safeStr(form.tipo).trim();

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
      setError(extractError(err, "Erro ao guardar sala."));
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
      setError(extractError(err, "Erro ao apagar sala."));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-pink-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BurgerMenu />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">
                  Gestão de Salas
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Administre as salas disponíveis na instituição</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                           hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium"
              >
                ← Voltar
              </button>

              <button
                type="button"
                onClick={openCreate}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white 
                           hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-medium shadow-lg shadow-purple-500/30
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                + Nova Sala
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {/* Toolbar */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:justify-between">
            <div className="flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Pesquisar por nome, tipo, capacidade ou ID..."
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div
              className="px-4 py-2 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 
                            rounded-lg border border-purple-200 dark:border-purple-800"
            >
              <span className="text-sm font-semibold text-purple-900 dark:text-purple-300">
                {filtered.length} {filtered.length === 1 ? "sala" : "salas"}
              </span>
            </div>
          </div>

          {/* ✅ Paginação compacta (topo) */}
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

        {error && (
          <div
            className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 
                          px-5 py-4 rounded-xl text-sm shadow-sm"
          >
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    ID
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Nome
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Tipo
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Capacidade
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-16 px-6 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      <p className="mt-3 text-gray-500 dark:text-gray-400">A carregar salas...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-16 px-6 text-center text-gray-500 dark:text-gray-400">
                      <div className="text-4xl mb-2">🏫</div>
                      Nenhuma sala encontrada
                    </td>
                  </tr>
                ) : (
                  paged.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-purple-50/50 dark:hover:bg-gray-800/60 transition-colors duration-150"
                    >
                      <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 font-mono">#{r.id}</td>

                      <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100 font-semibold">{r.nome}</td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${tipoColors[r.tipo] || tipoColors.Teorica
                            }`}
                        >
                          <span>{tipoIcons[r.tipo] || "📍"}</span>
                          {r.tipo}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                        <span className="inline-flex items-center gap-1.5">
                          <span>👤</span>
                          <span className="font-semibold">{r.capacidade}</span>
                          {Number(r.capacidade) === 1 ? "pessoa" : "pessoas"}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(r)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-yellow-700 dark:text-yellow-400 
                                       bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 
                                       transition-all duration-200"
                          >
                            ✏️ Editar
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteSala(r.id)}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 
                                       bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 
                                       transition-all duration-200"
                          >
                            🗑️ Apagar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ✅ Paginação compacta (fundo) */}
          {!loading && filtered.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 bg-white/70 dark:bg-gray-900/70">
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

      {/* Modal Create/Edit */}
      {showForm && (
        <Modal title={editing ? "✏️ Editar Sala" : "✨ Nova Sala"} onClose={closeForm} disabled={saving}>
          <form onSubmit={saveSala} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">Nome da Sala</label>
              <input
                name="nome"
                value={form.nome}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Ex: Sala A1"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">Tipo de Sala</label>
              <select
                name="tipo"
                value={form.tipo}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                disabled={saving}
              >
                {TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {tipoIcons[t]} {t}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Escolha o tipo que melhor descreve esta sala</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">Capacidade</label>
              <input
                type="number"
                name="capacidade"
                value={form.capacidade}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                min="1"
                disabled={saving}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Número máximo de pessoas</p>
            </div>

            {error && (
              <div
                className="md:col-span-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 
                              text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm"
              >
                {error}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={closeForm}
                className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                           hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 font-medium"
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white 
                           hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 transition-all duration-200 font-medium
                           shadow-lg shadow-purple-500/30"
                disabled={saving}
              >
                {saving ? "A guardar..." : editing ? "Guardar Alterações" : "Criar Sala"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
