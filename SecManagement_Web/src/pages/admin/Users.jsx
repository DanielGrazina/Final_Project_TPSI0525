// src/pages/admin/Users.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

/*
  Endpoints usados:
   - GET    /Users
   - PUT    /Users/{id}          (UpdateUserDto: Role, IsActive)
   - DELETE /Users/{id}

  Criação de utilizador:
   - NÃO existe POST /Users no teu backend.
   - Normalmente vem do AuthController (RegisterDto: Nome, Email, Password).
   - Como não colaste o AuthController, esta página tenta várias rotas comuns:
       POST /Auth/register
       POST /Auth/Register
       POST /Auth/register-user
       POST /auth/register
    (todas já com baseURL .../api)

  Depois do register:
   - Se a resposta devolver Id, usa-o.
   - Se não devolver, faz refresh do GET /Users e procura pelo Email para obter o Id.

  Depois:
   - Faz PUT /Users/{id} para meter Role/IsActive
   - Se escolheres "Formador" ou "Formando", cria o profile via ProfilesController:
       POST /Profiles/formador  (UserId, AreaEspecializacao, CorCalendario)
       POST /Profiles/formando  (UserId, NumeroAluno, DataNascimento)
*/

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

function isHexColor7(s) {
  return /^#[0-9A-Fa-f]{6}$/.test(s || "");
}

const ROLES = ["User", "Formador", "Formando", "Admin"];

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
    new Error(
      "Endpoint de registo não encontrado. Confirma a rota do AuthController (ex: POST /api/Auth/register)."
    )
  );
}

function RoleBadge({ role }) {
  const styles = {
    Admin: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    Formador: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    Formando: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    User: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[role] || styles.User}`}>
      {role}
    </span>
  );
}

function StatCard({ label, value, icon, color = "blue" }) {
  const colors = {
    blue: "from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10 text-blue-600 dark:text-blue-400",
    green: "from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10 text-green-600 dark:text-green-400",
    purple: "from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10 text-purple-600 dark:text-purple-400",
    amber: "from-amber-500/10 to-amber-600/5 dark:from-amber-500/20 dark:to-amber-600/10 text-amber-600 dark:text-amber-400",
  };

  return (
    <div className="relative overflow-hidden bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4">
      <div className={`absolute inset-0 bg-gradient-to-br ${colors[color]} opacity-50`} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
          </div>
          {icon && <div className={`${colors[color].split(' ')[colors[color].split(' ').length - 2]} ${colors[color].split(' ')[colors[color].split(' ').length - 1]}`}>{icon}</div>}
        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const navigate = useNavigate();

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
    loadUsers();
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const admins = users.filter(u => u.role === "Admin").length;
    const formadores = users.filter(u => u.isFormador).length;
    
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
    setError("");
    setSaving(true);

    try {
      await api.put(`/Users/${userId}`, {
        Role: edit.role,
        IsActive: edit.isActive,
      });
      setEditingId(null);
      await loadUsers();
    } catch (err) {
      setError(extractError(err, "Erro ao atualizar utilizador."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(userId) {
    if (!window.confirm("Apagar este utilizador?")) return;
    setError("");
    setSaving(true);
    try {
      await api.delete(`/Users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setError(extractError(err, "Erro ao apagar utilizador."));
    } finally {
      setSaving(false);
    }
  }

  async function createUserFlow(e) {
    e.preventDefault();
    setError("");

    const nome = (create.nome || "").trim();
    const email = (create.email || "").trim();
    const password = create.password || "";
    const role = create.role || "User";

    if (!nome) return alert("Nome é obrigatório.");
    if (!email) return alert("Email é obrigatório.");
    if (password.length < 6) return alert("A password deve ter pelo menos 6 caracteres.");
    if (!ROLES.includes(role)) return alert("Role inválido.");

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
      const registerPayload = {
        Nome: nome,
        Email: email,
        Password: password,
      };

      const regRes = await registerUser(registerPayload);

      let createdUserId =
        regRes?.data?.id ??
        regRes?.data?.userId ??
        regRes?.data?.user?.id ??
        null;

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
      } else {
        await loadUsers();
      }

      await api.put(`/Users/${createdUserId}`, {
        Role: role,
        IsActive: !!create.isActive,
      });

      if (role === "Formador") {
        await api.post("/Profiles/formador", {
          UserId: createdUserId,
          AreaEspecializacao: (create.areaEspecializacao || "").trim(),
          CorCalendario: (create.corCalendario || "").trim(),
        });
      } else if (role === "Formando") {
        await api.post("/Profiles/formando", {
          UserId: createdUserId,
          NumeroAluno: (create.numeroAluno || "").trim(),
          DataNascimento: create.dataNascimento,
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Utilizadores</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gestão completa de utilizadores e permissões
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded-lg border hover:bg-gray-100 transition-colors
                           dark:border-gray-700 dark:hover:bg-gray-800"
              >
                ← Voltar
              </button>

              <button
                onClick={openCreate}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium
                           hover:from-blue-700 hover:to-blue-800 transition-all
                           shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
                           disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
                disabled={saving}
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
          <StatCard 
            label="Total" 
            value={stats.total} 
            color="blue"
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>}
          />
          <StatCard 
            label="Ativos" 
            value={stats.active} 
            color="green"
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>}
          />
          <StatCard 
            label="Admins" 
            value={stats.admins} 
            color="purple"
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>}
          />
          <StatCard 
            label="Formadores" 
            value={stats.formadores} 
            color="amber"
            icon={<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>}
          />
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por ID, email ou role..."
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg
                           bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-shadow"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2
                             bg-white dark:bg-gray-900 dark:border-gray-800
                             text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="Todos">Todos</option>
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Estado:</span>
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2
                             bg-white dark:bg-gray-900 dark:border-gray-800
                             text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  <option value="Todos">Todos</option>
                  <option value="Ativos">Ativos</option>
                  <option value="Inativos">Inativos</option>
                </select>
              </div>

              <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap flex-1">{error}</div>
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
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Perfis</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-16 px-6">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-500 dark:text-gray-400">A carregar utilizadores...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 px-6">
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
                        <svg className="w-16 h-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <span>Sem utilizadores para mostrar</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const isEditing = editingId === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="py-4 px-6">
                          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">#{u.id}</span>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                              {(u.email || "?")[0].toUpperCase()}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{u.email}</span>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          {isEditing ? (
                            <select
                              name="role"
                              value={edit.role}
                              onChange={onEditChange}
                              className="border rounded-lg px-3 py-1.5
                                         bg-white dark:bg-gray-900 dark:border-gray-800
                                         text-gray-900 dark:text-gray-100 text-sm
                                         focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                              disabled={saving}
                            >
                              {ROLES.map((r) => (
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
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                name="isActive"
                                checked={!!edit.isActive}
                                onChange={onEditChange}
                                disabled={saving}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40"
                              />
                              <span className="text-sm text-gray-700 dark:text-gray-300">{edit.isActive ? "Ativo" : "Inativo"}</span>
                            </label>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                              <span className={`text-sm font-medium ${u.isActive ? 'text-green-700 dark:text-green-300' : 'text-gray-500 dark:text-gray-400'}`}>
                                {u.isActive ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1.5">
                            {u.isFormador && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-medium border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                                👨‍🏫 Formador
                              </span>
                            )}
                            {u.isFormando && (
                              <span className="inline-flex items-center px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-medium border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800">
                                🎓 Formando
                              </span>
                            )}
                            {!u.isFormador && !u.isFormando && (
                              <span className="text-xs text-gray-400 dark:text-gray-600">—</span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(u.id)}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium
                                             bg-green-100 text-green-700 hover:bg-green-200
                                             dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50
                                             transition-colors disabled:opacity-60"
                                  disabled={saving}
                                >
                                  ✓ Guardar
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium
                                             bg-gray-100 text-gray-700 hover:bg-gray-200
                                             dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700
                                             transition-colors disabled:opacity-60"
                                  disabled={saving}
                                >
                                  ✕ Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(u)}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium
                                             bg-blue-100 text-blue-700 hover:bg-blue-200
                                             dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50
                                             transition-colors disabled:opacity-60"
                                  disabled={saving}
                                >
                                  ✏ Editar
                                </button>
                                <button
                                  onClick={() => deleteUser(u.id)}
                                  className="px-3 py-1.5 rounded-lg text-sm font-medium
                                             bg-red-100 text-red-700 hover:bg-red-200
                                             dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50
                                             transition-colors disabled:opacity-60"
                                  disabled={saving}
                                >
                                  🗑 Apagar
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

        {/* Info note */}
        <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-blue-900 dark:text-blue-200">
            A criação usa o endpoint de registo do Auth. Se der erro 404, verifica a rota no AuthController.
          </p>
        </div>
      </div>

      {/* Modal Create */}
      {showCreate && (
        <Modal title="Criar Novo Utilizador" onClose={() => closeCreate(false)} disableClose={saving}>
          <form onSubmit={createUserFlow} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b dark:border-gray-800">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Informações Básicas</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Nome Completo
                  </label>
                  <input
                    name="nome"
                    value={create.nome}
                    onChange={onCreateChange}
                    className="w-full border rounded-lg px-3 py-2
                               bg-white dark:bg-gray-950 dark:border-gray-800
                               text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    disabled={saving}
                    placeholder="Ex: João Silva"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={create.email}
                    onChange={onCreateChange}
                    className="w-full border rounded-lg px-3 py-2
                               bg-white dark:bg-gray-950 dark:border-gray-800
                               text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    disabled={saving}
                    placeholder="exemplo@atec.pt"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={create.password}
                    onChange={onCreateChange}
                    className="w-full border rounded-lg px-3 py-2
                               bg-white dark:bg-gray-950 dark:border-gray-800
                               text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    disabled={saving}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">A password deve ter pelo menos 6 caracteres</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Perfil
                  </label>
                  <select
                    name="role"
                    value={create.role}
                    onChange={onCreateChange}
                    className="w-full border rounded-lg px-3 py-2
                               bg-white dark:bg-gray-950 dark:border-gray-800
                               text-gray-900 dark:text-gray-100
                               focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    disabled={saving}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Se escolheres Formador/Formando, o perfil é criado automaticamente
                  </p>
                </div>

                <div className="flex items-center">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={!!create.isActive}
                      onChange={onCreateChange}
                      disabled={saving}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500/40"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Conta Ativa</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Formador Fields */}
            {create.role === "Formador" && (
              <div className="space-y-4 pt-4 border-t dark:border-gray-800">
                <div className="flex items-center gap-2 pb-2">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Dados de Formador</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Área de Especialização
                    </label>
                    <input
                      name="areaEspecializacao"
                      value={create.areaEspecializacao}
                      onChange={onCreateChange}
                      className="w-full border rounded-lg px-3 py-2
                                 bg-white dark:bg-gray-950 dark:border-gray-800
                                 text-gray-900 dark:text-gray-100
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      disabled={saving}
                      placeholder="Ex: Redes / Programação / Segurança..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Cor do Calendário
                    </label>
                    <input
                      name="corCalendario"
                      value={create.corCalendario}
                      onChange={onCreateChange}
                      className="w-full border rounded-lg px-3 py-2 font-mono
                                 bg-white dark:bg-gray-950 dark:border-gray-800
                                 text-gray-900 dark:text-gray-100
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      disabled={saving}
                      placeholder="#3B82F6"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Formato: #RRGGBB</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Pré-visualização
                    </label>
                    <div
                      className="w-full h-10 rounded-lg border dark:border-gray-800 shadow-inner"
                      style={{ background: create.corCalendario }}
                      title={create.corCalendario}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Formando Fields */}
            {create.role === "Formando" && (
              <div className="space-y-4 pt-4 border-t dark:border-gray-800">
                <div className="flex items-center gap-2 pb-2">
                  <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Dados de Formando</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Número de Aluno
                    </label>
                    <input
                      name="numeroAluno"
                      value={create.numeroAluno}
                      onChange={onCreateChange}
                      className="w-full border rounded-lg px-3 py-2
                                 bg-white dark:bg-gray-950 dark:border-gray-800
                                 text-gray-900 dark:text-gray-100
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      disabled={saving}
                      placeholder="Ex: ATEC-12345"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Data de Nascimento
                    </label>
                    <input
                      type="date"
                      name="dataNascimento"
                      value={create.dataNascimento}
                      onChange={onCreateChange}
                      className="w-full border rounded-lg px-3 py-2
                                 bg-white dark:bg-gray-950 dark:border-gray-800
                                 text-gray-900 dark:text-gray-100
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-800">
              <button
                type="button"
                onClick={() => closeCreate(false)}
                className="px-5 py-2.5 rounded-lg border hover:bg-gray-100 transition-colors
                           dark:border-gray-700 dark:hover:bg-gray-800
                           disabled:opacity-60"
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium
                           hover:from-blue-700 hover:to-blue-800 transition-all
                           shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
                           disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
                disabled={saving}
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    A criar...
                  </span>
                ) : (
                  "Criar Utilizador"
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}