// src/pages/admin/Areas.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getToken, getUserRoleFromToken } from "../../utils/auth";
import BurgerMenu from "../../components/BurgerMenu";

/* ---------------- helpers ---------------- */

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

/* ---------------- UI (uniform) ---------------- */

function HeaderIcon({ icon = "areas" }) {
  return (
    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
      {icon === "areas" ? (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6h5v5H6V6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M13 6h5v5h-5V6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M6 13h5v5H6v-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M13 13h5v5h-5v-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </div>
  );
}

function Btn({ children, tone = "neutral", className = "", ...props }) {
  const map = {
    neutral:
      "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800",
    blue:
      "border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/50 dark:text-blue-200 dark:hover:bg-blue-950/30",
    green:
      "border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/50 dark:text-emerald-200 dark:hover:bg-emerald-950/30",
    red:
      "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-200 dark:hover:bg-red-950/30",
  };

  return (
    <button
      type="button"
      className={[
        "px-4 py-2 rounded-lg border text-sm font-semibold transition",
        "active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
        map[tone] || map.neutral,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ children, tone = "blue", className = "", ...props }) {
  const map = {
    blue: "from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-blue-500/25",
    green: "from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-500/25",
    red: "from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-red-500/25",
  };

  return (
    <button
      type="button"
      className={[
        "px-4 py-2 rounded-lg font-semibold text-white transition",
        "shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
        `bg-gradient-to-r ${map[tone] || map.blue}`,
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

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
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur">
          <h3 className="font-black text-lg text-gray-900 dark:text-gray-100">{title}</h3>
          <Btn onClick={onClose} disabled={disabled}>
            Fechar
          </Btn>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/* ---------------- Pagination (Courses-like) ---------------- */

function PaginationBar({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled,
  position = "bottom", // "top" | "bottom"
  label = "Áreas",
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(total, safePage * pageSize);

  const isTop = position === "top";
  const canPrev = safePage > 1;
  const canNext = safePage < totalPages;

  return (
    <div
      className={[
        "flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 px-4 py-4",
        "bg-white dark:bg-gray-900",
        isTop ? "border-b border-gray-200 dark:border-gray-800" : "border-t border-gray-200 dark:border-gray-800",
      ].join(" ")}
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {label}{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {from}–{to}
          </span>{" "}
          de{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {total}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Por página</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className="border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900
                       text-gray-900 dark:text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <Btn onClick={() => onPageChange(1)} disabled={disabled || !canPrev} className="px-3 py-2">
          «
        </Btn>
        <Btn onClick={() => onPageChange(safePage - 1)} disabled={disabled || !canPrev} className="px-3 py-2">
          ‹
        </Btn>

        <div className="text-sm font-semibold text-gray-700 dark:text-gray-200 px-3">
          Página {safePage} / {totalPages}
        </div>

        <Btn onClick={() => onPageChange(safePage + 1)} disabled={disabled || !canNext} className="px-3 py-2">
          ›
        </Btn>
        <Btn onClick={() => onPageChange(totalPages)} disabled={disabled || !canNext} className="px-3 py-2">
          »
        </Btn>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */

export default function Areas() {
  const navigate = useNavigate();

  const token = getToken();
  const role = getUserRoleFromToken(token) || "User";

  const canManage = role === "Admin" || role === "SuperAdmin";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [search, setSearch] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // modal create/edit
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // create | edit
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    id: null,
    nome: "",
    descricao: "",
  });

  async function load() {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const res = await api.get("/Areas");
      const arr = Array.isArray(res.data) ? res.data : [];
      setItems(arr);
    } catch (e) {
      setError(extractError(e, "Falha ao carregar áreas."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return items;

    return items.filter((a) => {
      const id = safeStr(a.id);
      const nome = safeStr(a.nome ?? a.name ?? "");
      const desc = safeStr(a.descricao ?? a.description ?? "");
      return id.includes(s) || nome.toLowerCase().includes(s) || desc.toLowerCase().includes(s);
    });
  }, [items, search]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  function openCreate() {
    setMode("create");
    setForm({ id: null, nome: "", descricao: "" });
    setError("");
    setInfo("");
    setOpen(true);
  }

  function openEdit(area) {
    setMode("edit");
    setForm({
      id: area.id,
      nome: safeStr(area.nome ?? area.name ?? ""),
      descricao: safeStr(area.descricao ?? area.description ?? ""),
    });
    setError("");
    setInfo("");
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
  }

  async function save(e) {
    e.preventDefault();
    if (!canManage) return;

    const nome = form.nome.trim();
    if (!nome) {
      setError("O nome é obrigatório.");
      return;
    }

    setSaving(true);
    setError("");
    setInfo("");

    try {
      const payload = {
        nome,
        descricao: form.descricao?.trim() || null,
      };

      if (mode === "create") {
        await api.post("/Areas", payload);
        setInfo("Área criada.");
      } else {
        await api.put(`/Areas/${form.id}`, payload);
        setInfo("Área atualizada.");
      }

      setOpen(false);
      await load();
      setTimeout(() => setInfo(""), 1200);
    } catch (e2) {
      setError(extractError(e2, "Falha ao guardar área."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(area) {
    if (!canManage) return;
    if (!window.confirm(`Apagar a área "${safeStr(area.nome ?? area.name)}"?`)) return;

    setError("");
    setInfo("");
    try {
      await api.delete(`/Areas/${area.id}`);
      setInfo("Área apagada.");
      await load();
      setTimeout(() => setInfo(""), 1200);
    } catch (e) {
      setError(extractError(e, "Falha ao apagar área."));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur-xl dark:bg-gray-900/90 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BurgerMenu />
            <HeaderIcon icon="areas" />
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Áreas</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Gestão de áreas de formação.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canManage && (
              <PrimaryBtn tone="blue" onClick={openCreate} disabled={loading}>
                + Nova Área
              </PrimaryBtn>
            )}
            <Btn onClick={() => navigate("/dashboard")}>← Voltar</Btn>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {(error || info) && (
          <div className="mb-6 space-y-3">
            {error && (
              <div className="bg-red-50 border border-red-200 dark:bg-red-950/25 dark:border-red-900/40 rounded-xl p-4 text-sm text-red-700 dark:text-red-200">
                {error}
              </div>
            )}
            {info && (
              <div className="bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40 rounded-xl p-4 text-sm text-emerald-800 dark:text-emerald-200">
                {info}
              </div>
            )}
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por id, nome, descrição..."
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800
                         bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            />

            <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>

            <Btn onClick={load} disabled={loading}>
              Atualizar
            </Btn>
          </div>
        </div>

        {/* Separator */}
        <div className="my-6 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />

        {/* Table + Pagination */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          {/* Paginação no topo */}
          <PaginationBar
            position="top"
            label="Áreas"
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            disabled={loading}
          />

          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-600 dark:text-gray-300">A carregar...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-gray-600 dark:text-gray-400">Sem áreas.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-950/30">
                  <tr className="text-left">
                    <th className="px-4 py-3 text-xs font-black text-gray-700 dark:text-gray-200">ID</th>
                    <th className="px-4 py-3 text-xs font-black text-gray-700 dark:text-gray-200">Nome</th>
                    <th className="px-4 py-3 text-xs font-black text-gray-700 dark:text-gray-200">Descrição</th>
                    <th className="px-4 py-3 text-xs font-black text-gray-700 dark:text-gray-200 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {paged.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-semibold whitespace-nowrap">
                        {a.id}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-bold">
                        {safeStr(a.nome ?? a.name ?? "—")}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {safeStr(a.descricao ?? a.description ?? "—")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          <Btn tone="blue" onClick={() => openEdit(a)} disabled={!canManage}>
                            Editar
                          </Btn>
                          <Btn tone="red" onClick={() => remove(a)} disabled={!canManage}>
                            Apagar
                          </Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ✅ PAGINAÇÃO NO FUNDO (estilo Página X/Y) */}
          <PaginationBar
            position="bottom"
            label="Áreas"
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
            disabled={loading}
          />
        </div>
      </div>

      {/* Modal */}
      {open && (
        <Modal title={mode === "create" ? "Nova Área" : "Editar Área"} onClose={closeModal} disabled={saving}>
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Nome</label>
              <input
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                disabled={saving}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                           bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Ex: Desenvolvimento"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Descrição</label>
              <textarea
                value={form.descricao}
                onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
                disabled={saving}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                           bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                placeholder="Opcional"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Btn onClick={closeModal} disabled={saving}>
                Cancelar
              </Btn>
              <PrimaryBtn tone="blue" type="submit" disabled={saving}>
                {saving ? "A guardar..." : "Guardar"}
              </PrimaryBtn>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
