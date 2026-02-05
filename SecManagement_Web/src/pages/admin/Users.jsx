// src/pages/admin/Users.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getToken, getUserRoleFromToken, isTokenExpired } from "../../utils/auth";

function Modal({ title, children, onClose, disableClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !disableClose && onClose()}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border dark:border-gray-800 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-t-2xl">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            disabled={disableClose}
            className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-60 transition-colors
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

// ✅ roles existentes no sistema (para mostrar)
const ROLES_ALL = ["User", "Formando", "Formador", "Secretaria", "Admin", "SuperAdmin"];

// ✅ roles que podem ser atribuídas (NÃO inclui SuperAdmin)
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${cls}`}>
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
    <div className="relative overflow-hidden bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4">
      <div className={`absolute inset-0 bg-gradient-to-br ${colors[color]} opacity-50`} />
      <div className="relative">
        <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      </div>
    </div>
  );
}

export default function Users() {
  const navigate = useNavigate();

  const token = getToken();
  const myRole = useMemo(() => getUserRoleFromToken(token), [token]);

  const perms = useMemo(() => {
    const isSuperAdmin = myRole === "SuperAdmin";
    const isAdmin = myRole === "Admin";
    const isSecretaria = myRole === "Secretaria";

    // ✅ igual ao UsersController
    const canView = isSuperAdmin || isAdmin || isSecretaria;
    const canEdit = isSuperAdmin || isAdmin || isSecretaria; // PUT permitido
    const canDelete = isSuperAdmin || isAdmin; // DELETE permitido
    const canCreate = isSuperAdmin || isAdmin || isSecretaria; // via Auth (assumido)

    return { myRole, isSuperAdmin, isAdmin, isSecretaria, canView, canEdit, canDelete, canCreate };
  }, [myRole]);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("Todos");
  const [activeFilter, setActiveFilter] = useState("Todos");

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
    // proteção extra se token morrer
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

    // ✅ SuperAdmin não pode ser alterado (regra do teu print)
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

  function onEditChange(e) {
    const { name, value, type, checked } = e.target;
    setEdit((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  }

  async function saveEdit(userId) {
    if (!perms.canEdit) return;

    setError("");
    setSaving(true);

    try {
      // ✅ UpdateUserDto: Role, IsActive
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

    // extra safety
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

    // ✅ impedir atribuição de SuperAdmin via UI
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
      // 1) Register
      const regRes = await registerUser({ nome, email, password });

      let createdUserId = regRes?.data?.id ?? regRes?.data?.userId ?? regRes?.data?.user?.id ?? null;

      // fallback: refresh e procurar pelo email
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

      // 2) aplicar role/isActive (PUT permitido para Admin/SuperAdmin/Secretaria)
      await api.put(`/Users/${createdUserId}`, {
        role,
        isActive: !!create.isActive,
      });

      // 3) criar profiles
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
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl dark:bg-gray-900/90 border-b dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Utilizadores</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Roles permitidos: {ROLES_ALL.join(", ")}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded-lg border hover:bg-gray-100 transition-colors dark:border-gray-700 dark:hover:bg-gray-800"
              >
                ← Voltar
              </button>

              <button
                onClick={openCreate}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium
                           hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30
                           hover:shadow-xl hover:shadow-blue-500/40 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
                disabled={saving || !perms.canCreate}
                title={!perms.canCreate ? "Sem permissão para criar utilizadores." : ""}
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

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por ID, email ou role..."
                className="w-full px-4 py-2.5 border rounded-lg bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
                className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
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
          <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded-xl p-4 mb-6 whitespace-pre-wrap">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border-b dark:border-gray-700">
                <tr>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">ID</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Email</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Role</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Ativo</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Ações</th>
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
                  filtered.map((u) => {
                    const isEditing = editingId === u.id;
                    const targetIsSuperAdmin = u.role === "SuperAdmin";
                    const disableEditThisRow = targetIsSuperAdmin; // regra do teu print

                    return (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-4 px-6 text-sm font-mono text-gray-600 dark:text-gray-400">#{u.id}</td>

                        <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100">{u.email}</td>

                        <td className="py-4 px-6">
                          {isEditing ? (
                            <select
                              name="role"
                              value={edit.role}
                              onChange={onEditChange}
                              className="border rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 dark:text-gray-100 text-sm
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
                                onChange={onEditChange}
                                disabled={saving}
                              />
                              <span className="text-sm">{edit.isActive ? "Ativo" : "Inativo"}</span>
                            </label>
                          ) : (
                            <span className="text-sm">{u.isActive ? "Ativo" : "Inativo"}</span>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex gap-2 flex-wrap">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(u.id)}
                                  disabled={saving}
                                  className="px-3 py-1.5 rounded-lg text-sm bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-60"
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={saving}
                                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(u)}
                                  disabled={saving || !perms.canEdit || disableEditThisRow}
                                  title={disableEditThisRow ? "SuperAdmin não pode ser alterado." : !perms.canEdit ? "Sem permissão." : ""}
                                  className="px-3 py-1.5 rounded-lg text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-60"
                                >
                                  Editar
                                </button>

                                <button
                                  onClick={() => deleteUser(u)}
                                  disabled={saving || !perms.canDelete || targetIsSuperAdmin}
                                  title={targetIsSuperAdmin ? "Não podes apagar um SuperAdmin." : !perms.canDelete ? "Sem permissão." : ""}
                                  className="px-3 py-1.5 rounded-lg text-sm bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-60"
                                >
                                  Apagar
                                </button>
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
        </div>
      </div>

      {/* Modal Create */}
      {showCreate && (
        <Modal title="Criar Novo Utilizador" onClose={() => closeCreate(false)} disableClose={saving}>
          <form onSubmit={createUserFlow} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input name="nome" value={create.nome} onChange={onCreateChange} disabled={saving} className="w-full border rounded-lg px-3 py-2" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Email</label>
                <input type="email" name="email" value={create.email} onChange={onCreateChange} disabled={saving} className="w-full border rounded-lg px-3 py-2" />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Password</label>
                <input type="password" name="password" value={create.password} onChange={onCreateChange} disabled={saving} className="w-full border rounded-lg px-3 py-2" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select name="role" value={create.role} onChange={onCreateChange} disabled={saving} className="w-full border rounded-lg px-3 py-2">
                  {ROLES_ASSIGNABLE.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">SuperAdmin não pode ser atribuído.</p>
              </div>

              <div className="flex items-center">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" name="isActive" checked={!!create.isActive} onChange={onCreateChange} disabled={saving} />
                  <span className="text-sm">Conta ativa</span>
                </label>
              </div>
            </div>

            {create.role === "Formador" && (
              <div className="pt-4 border-t space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Área de Especialização</label>
                  <input name="areaEspecializacao" value={create.areaEspecializacao} onChange={onCreateChange} disabled={saving} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Cor Calendário</label>
                  <input name="corCalendario" value={create.corCalendario} onChange={onCreateChange} disabled={saving} className="w-full border rounded-lg px-3 py-2 font-mono" />
                </div>
              </div>
            )}

            {create.role === "Formando" && (
              <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Número de Aluno</label>
                  <input name="numeroAluno" value={create.numeroAluno} onChange={onCreateChange} disabled={saving} className="w-full border rounded-lg px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Data de Nascimento</label>
                  <input type="date" name="dataNascimento" value={create.dataNascimento} onChange={onCreateChange} disabled={saving} className="w-full border rounded-lg px-3 py-2" />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button type="button" onClick={() => closeCreate(false)} disabled={saving} className="px-4 py-2 rounded-lg border">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-60">
                {saving ? "A criar..." : "Criar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
