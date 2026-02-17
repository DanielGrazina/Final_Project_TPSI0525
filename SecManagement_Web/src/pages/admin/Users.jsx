// src/pages/admin/Users.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getToken, getUserRoleFromToken, isTokenExpired } from "../../utils/auth";
import BurgerMenu from "../../components/BurgerMenu";

/* ---------------- UI bits ---------------- */

function Modal({ title, children, onClose, disableClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !disableClose && onClose()}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={disableClose}
            className={[
              "px-3 py-2 rounded-lg border text-sm font-semibold transition",
              disableClose
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800",
            ].join(" ")}
          >
            Fechar
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function extractError(err, fallback) {
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

function isHexColor7(s) {
  return /^#[0-9A-Fa-f]{6}$/.test(s || "");
}

const ROLES_ALL = ["User", "Formando", "Formador", "Secretaria", "Admin", "SuperAdmin"];
const ROLES_ASSIGNABLE = ["User", "Formando", "Formador", "Secretaria", "Admin"];

async function registerUser(payload) {
  const candidates = ["/Auth/register", "/Auth/Register", "/Auth/register-user", "/auth/register"];
  let lastErr = null;

  for (const path of candidates) {
    try {
      const res = await api.post(path, payload);
      return res;
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }

  throw (
    lastErr ||
    new Error("Endpoint de registo não encontrado. Confirma a rota do AuthController (ex: POST /api/Auth/register).")
  );
}

function RoleBadge({ role }) {
  const styles = {
    SuperAdmin:
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-200 dark:border-purple-800",
    Admin: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    Secretaria:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    Formador:
      "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
    Formando:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800",
    User: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  };

  const cls = styles[role] || styles.User;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {role}
    </span>
  );
}

function StatCard({ label, value, color = "blue" }) {
  const colors = {
    blue: "from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10",
    green: "from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10",
    purple: "from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10",
    amber: "from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10",
  };

  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className={`absolute inset-0 bg-gradient-to-br ${colors[color]} opacity-50`} />
      <div className="relative">
        <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">{label}</div>
        <div className="text-2xl font-black text-gray-900 dark:text-gray-100">{value}</div>
      </div>
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
        "px-3 py-1.5 rounded-lg border text-sm font-semibold transition",
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

function PillAction({ label, variant, ...props }) {
  const cls =
    variant === "edit"
      ? "bg-blue-600/10 text-blue-700 border-blue-200 hover:bg-blue-600/15 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-900/50"
      : "bg-red-600/10 text-red-700 border-red-200 hover:bg-red-600/15 dark:bg-red-500/15 dark:text-red-200 dark:border-red-900/50";

  return (
    <button
      type="button"
      className={[
        "px-3 py-1.5 rounded-full border text-sm font-semibold transition",
        "hover:shadow-sm active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
        cls,
      ].join(" ")}
      {...props}
    >
      {label}
    </button>
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
  label = "Utilizadores",
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

export default function Users() {
  const navigate = useNavigate();

  const token = getToken();
  const myRole = useMemo(() => getUserRoleFromToken(token), [token]);

  const perms = useMemo(() => {
    const isSuperAdmin = myRole === "SuperAdmin";
    const isAdmin = myRole === "Admin";
    const isSecretaria = myRole === "Secretaria";

    const canView = isSuperAdmin || isAdmin || isSecretaria;
    const canEdit = isSuperAdmin || isAdmin || isSecretaria;
    const canDelete = isSuperAdmin || isAdmin;
    const canCreate = isSuperAdmin || isAdmin || isSecretaria;

    return { myRole, isSuperAdmin, isAdmin, isSecretaria, canView, canEdit, canDelete, canCreate };
  }, [myRole]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos");
  const [activeFilter, setActiveFilter] = useState("Todos");

  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showCreate, setShowCreate] = useState(false);
  const [create, setCreate] = useState({
    nome: "",
    email: "",
    password: "",
    role: "User",
    isActive: true,

    areaEspecializacao: "",
    corCalendario: "#3B82F6",

    numeroAluno: "",
    dataNascimento: "",
  });

  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState({ role: "User", isActive: true });

  useEffect(() => {
    if (!token || isTokenExpired(token)) {
      navigate("/", { replace: true });
    }
  }, [navigate, token]);

  async function loadUsers() {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/Users");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(extractError(err, "Erro ao carregar utilizadores."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!perms.canView) {
      setLoading(false);
      setUsers([]);
      setError("Sem permissão para ver utilizadores.");
      return;
    }
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perms.canView]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const admins = users.filter((u) => u.role === "Admin" || u.role === "SuperAdmin").length;
    const formadores = users.filter((u) => u.isFormador).length;
    return { total, active, admins, formadores };
  }, [users]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !s ||
        String(u.id ?? "").includes(s) ||
        (u.email || "").toLowerCase().includes(s) ||
        (u.role || "").toLowerCase().includes(s);

      const matchesRole = roleFilter === "Todos" ? true : u.role === roleFilter;

      const matchesActive =
        activeFilter === "Todos" ? true : activeFilter === "Ativos" ? u.isActive === true : u.isActive === false;

      return matchesSearch && matchesRole && matchesActive;
    });
  }, [users, search, roleFilter, activeFilter]);

  useEffect(() => setPage(1), [search, roleFilter, activeFilter, pageSize]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / pageSize)), [filtered.length, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  function openCreate() {
    setError("");
    setCreate({
      nome: "",
      email: "",
      password: "",
      role: "User",
      isActive: true,
      areaEspecializacao: "",
      corCalendario: "#3B82F6",
      numeroAluno: "",
      dataNascimento: "",
    });
    setShowCreate(true);
  }

  function closeCreate(force = false) {
    if (!force && saving) return;
    setShowCreate(false);
  }

  function onCreateChange(e) {
    const { name, value, type, checked } = e.target;
    setCreate((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }

  function startEdit(u) {
    if (!perms.canEdit) return;

    if (u.role === "SuperAdmin") {
      setError("O role de SuperAdmin não pode ser alterado.");
      return;
    }

    setEditingId(u.id);
    setEdit({ role: u.role || "User", isActive: !!u.isActive });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function onEditChangeSafe(e) {
    const name = e.target.name;
    const value = e.target.value;
    const type = e.target.type;
    const checked = e.target.checked;
    setEdit((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }

  async function saveEdit(userId) {
    if (!perms.canEdit) return;

    setError("");
    setSaving(true);

    try {
      await api.put(`/Users/${userId}`, {
        role: edit.role,
        isActive: edit.isActive,
      });

      setEditingId(null);
      await loadUsers();
    } catch (err) {
      setError(extractError(err, "Erro ao atualizar utilizador."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(u) {
    if (!perms.canDelete) return;

    if (u.role === "SuperAdmin") {
      setError("Não podes apagar um SuperAdmin.");
      return;
    }

    if (!window.confirm("Apagar este utilizador?")) return;

    setError("");
    setSaving(true);

    try {
      await api.delete(`/Users/${u.id}`);
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (err) {
      setError(extractError(err, "Erro ao apagar utilizador."));
    } finally {
      setSaving(false);
    }
  }

  async function createUserFlow(e) {
    e.preventDefault();
    if (!perms.canCreate) {
      setError("Sem permissão para criar utilizadores.");
      return;
    }

    setError("");

    const nome = (create.nome || "").trim();
    const email = (create.email || "").trim();
    const password = create.password || "";
    const role = create.role || "User";

    if (!nome) return alert("Nome é obrigatório.");
    if (!email) return alert("Email é obrigatório.");
    if (password.length < 6) return alert("A password deve ter pelo menos 6 caracteres.");

    if (!ROLES_ASSIGNABLE.includes(role)) return alert("Role inválida (SuperAdmin não pode ser atribuído).");

    if (role === "Formador") {
      const area = (create.areaEspecializacao || "").trim();
      const cor = (create.corCalendario || "").trim();
      if (area.length < 2) return alert("Área de especialização é obrigatória.");
      if (!isHexColor7(cor)) return alert("Cor calendário inválida (#RRGGBB).");
    }

    if (role === "Formando") {
      const num = (create.numeroAluno || "").trim();
      const dn = create.dataNascimento;
      if (num.length < 2) return alert("Número de aluno é obrigatório.");
      if (!dn) return alert("Data de nascimento é obrigatória.");
    }

    setSaving(true);

    try {
      const regRes = await registerUser({ nome, email, password });

      let createdUserId = regRes?.data?.id ?? regRes?.data?.userId ?? regRes?.data?.user?.id ?? null;

      if (!createdUserId) {
        const listRes = await api.get("/Users");
        const arr = Array.isArray(listRes.data) ? listRes.data : [];
        const found = arr.find((u) => String(u.email || "").toLowerCase() === email.toLowerCase());
        if (!found?.id) {
          setUsers(arr);
          throw new Error("Utilizador criado mas não consegui obter o Id. Recarrega a página e procura pelo email.");
        }
        createdUserId = found.id;
        setUsers(arr);
      }

      await api.put(`/Users/${createdUserId}`, {
        role,
        isActive: !!create.isActive,
      });

      if (role === "Formador") {
        await api.post("/Profiles/formador", {
          userId: createdUserId,
          areaEspecializacao: (create.areaEspecializacao || "").trim(),
          corCalendario: (create.corCalendario || "").trim(),
        });
      } else if (role === "Formando") {
        await api.post("/Profiles/formando", {
          userId: createdUserId,
          numeroAluno: (create.numeroAluno || "").trim(),
          dataNascimento: create.dataNascimento,
        });
      }

      closeCreate(true);
      await loadUsers();
      alert("Utilizador criado com sucesso!");
    } catch (err) {
      setError(extractError(err, "Erro ao criar utilizador."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl dark:bg-gray-900/90 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BurgerMenu />
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Utilizadores</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Roles: {ROLES_ALL.join(", ")}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Btn onClick={() => navigate("/dashboard")}>← Voltar</Btn>

              <button
                type="button"
                onClick={openCreate}
                disabled={saving || !perms.canCreate}
                title={!perms.canCreate ? "Sem permissão para criar utilizadores." : ""}
                className={[
                  "px-4 py-2 rounded-lg font-semibold text-white transition",
                  "shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35 active:scale-95",
                  saving || !perms.canCreate
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
                ].join(" ")}
              >
                + Novo Utilizador
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total" value={stats.total} color="blue" />
          <StatCard label="Ativos" value={stats.active} color="green" />
          <StatCard label="Admins" value={stats.admins} color="purple" />
          <StatCard label="Formadores" value={stats.formadores} color="amber" />
        </div>

        {/* Separator */}
        <div className="my-6 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por ID, email ou role..."
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-lg
                           bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 bg-white dark:bg-gray-900
                           text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="Todos">Todos</option>
                {ROLES_ALL.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 bg-white dark:bg-gray-900
                           text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              >
                <option value="Todos">Todos</option>
                <option value="Ativos">Ativos</option>
                <option value="Inativos">Inativos</option>
              </select>

              <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 dark:bg-red-950/25 dark:border-red-900/40 rounded-xl p-4 mb-6 text-red-700 dark:text-red-200 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          <PaginationBar
            position="top"
            label="Utilizadores"
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

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="text-left text-xs font-black text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="text-left text-xs font-black text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left text-xs font-black text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="text-left text-xs font-black text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">
                    Ativo
                  </th>
                  <th className="text-left text-xs font-black text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-16 px-6 text-center text-gray-500 dark:text-gray-400">
                      A carregar...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-16 px-6 text-center text-gray-500 dark:text-gray-400">
                      Sem utilizadores
                    </td>
                  </tr>
                ) : (
                  paged.map((u) => {
                    const isEditing = editingId === u.id;
                    const targetIsSuperAdmin = u.role === "SuperAdmin";

                    return (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="py-4 px-6 text-sm font-mono text-gray-700 dark:text-gray-300">#{u.id}</td>

                        <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100">{u.email}</td>

                        <td className="py-4 px-6">
                          {isEditing ? (
                            <select
                              name="role"
                              value={edit.role}
                              onChange={onEditChangeSafe}
                              className="border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-1.5
                                         bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm
                                         focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                              disabled={saving}
                            >
                              {ROLES_ASSIGNABLE.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <RoleBadge role={u.role} />
                          )}
                        </td>

                        <td className="py-4 px-6">
                          {isEditing ? (
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="isActive"
                                checked={!!edit.isActive}
                                onChange={onEditChangeSafe}
                                disabled={saving}
                              />
                              <span className="text-sm text-gray-900 dark:text-gray-100">
                                {edit.isActive ? "Ativo" : "Inativo"}
                              </span>
                            </label>
                          ) : (
                            <span
                              className={`text-sm font-semibold ${u.isActive
                                ? "text-emerald-700 dark:text-emerald-300"
                                : "text-gray-500 dark:text-gray-400"
                                }`}
                            >
                              {u.isActive ? "Ativo" : "Inativo"}
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex gap-2 flex-wrap">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => saveEdit(u.id)}
                                  disabled={saving}
                                  className={[
                                    "px-4 py-1.5 rounded-full border text-sm font-semibold transition",
                                    "active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
                                    saving
                                      ? "bg-gray-100 text-gray-400 border-gray-200 dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700"
                                      : "bg-emerald-600/10 text-emerald-700 border-emerald-200 hover:bg-emerald-600/15 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-900/50",
                                  ].join(" ")}
                                >
                                  Guardar
                                </button>

                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  disabled={saving}
                                  className="px-4 py-1.5 rounded-full border text-sm font-semibold transition
                                             border-gray-200 text-gray-700 hover:bg-gray-50
                                             dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800
                                             active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <PillAction
                                  label="Editar"
                                  variant="edit"
                                  onClick={() => startEdit(u)}
                                  disabled={saving || !perms.canEdit || targetIsSuperAdmin}
                                  title={
                                    targetIsSuperAdmin
                                      ? "SuperAdmin não pode ser alterado."
                                      : !perms.canEdit
                                        ? "Sem permissão."
                                        : ""
                                  }
                                />

                                <PillAction
                                  label="Apagar"
                                  variant="delete"
                                  onClick={() => deleteUser(u)}
                                  disabled={saving || !perms.canDelete || targetIsSuperAdmin}
                                  title={
                                    targetIsSuperAdmin
                                      ? "Não podes apagar um SuperAdmin."
                                      : !perms.canDelete
                                        ? "Sem permissão."
                                        : ""
                                  }
                                />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <PaginationBar
            position="bottom"
            label="Utilizadores"
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

      {/* Modal Create */}
      {showCreate && (
        <Modal title="Criar Novo Utilizador" onClose={() => closeCreate(false)} disableClose={saving}>
          <form onSubmit={createUserFlow} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">Nome</label>
                <input
                  name="nome"
                  value={create.nome}
                  onChange={onCreateChange}
                  disabled={saving}
                  className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">Email</label>
                <input
                  type="email"
                  name="email"
                  value={create.email}
                  onChange={onCreateChange}
                  disabled={saving}
                  className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">Password</label>
                <input
                  type="password"
                  name="password"
                  value={create.password}
                  onChange={onCreateChange}
                  disabled={saving}
                  className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">Role</label>
                <select
                  name="role"
                  value={create.role}
                  onChange={onCreateChange}
                  disabled={saving}
                  className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  {ROLES_ASSIGNABLE.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">SuperAdmin não pode ser atribuído.</p>
              </div>

              <div className="flex items-center">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={!!create.isActive}
                    onChange={onCreateChange}
                    disabled={saving}
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Conta ativa</span>
                </label>
              </div>
            </div>

            {create.role === "Formador" && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">
                    Área de Especialização
                  </label>
                  <input
                    name="areaEspecializacao"
                    value={create.areaEspecializacao}
                    onChange={onCreateChange}
                    disabled={saving}
                    className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">
                    Cor Calendário
                  </label>
                  <input
                    name="corCalendario"
                    value={create.corCalendario}
                    onChange={onCreateChange}
                    disabled={saving}
                    className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 font-mono
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>
            )}

            {create.role === "Formando" && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">
                    Número de Aluno
                  </label>
                  <input
                    name="numeroAluno"
                    value={create.numeroAluno}
                    onChange={onCreateChange}
                    disabled={saving}
                    className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-gray-200">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    name="dataNascimento"
                    value={create.dataNascimento}
                    onChange={onCreateChange}
                    disabled={saving}
                    className="w-full border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              <Btn onClick={() => closeCreate(false)} disabled={saving}>
                Cancelar
              </Btn>

              <button
                type="submit"
                disabled={saving}
                className={[
                  "px-4 py-2 rounded-lg font-semibold text-white transition active:scale-95 disabled:opacity-60",
                  saving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
                ].join(" ")}
              >
                {saving ? "A criar..." : "Criar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
