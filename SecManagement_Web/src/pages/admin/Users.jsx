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
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => !disableClose && onClose()}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            disabled={disableClose}
            className="px-3 py-1 rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-60
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
  // Tenta rotas comuns sem te obrigar a mexer já no AuthController
  const candidates = ["/Auth/register", "/Auth/Register", "/Auth/register-user", "/auth/register"];

  let lastErr = null;

  for (const path of candidates) {
    try {
      const res = await api.post(path, payload);
      return res;
    } catch (err) {
      // se for 404, tenta a próxima
      const status = err?.response?.status;
      if (status === 404) {
        lastErr = err;
        continue;
      }
      // se não for 404, é erro real do backend -> parar
      throw err;
    }
  }

  // Se todas deram 404:
  throw (
    lastErr ||
    new Error(
      "Endpoint de registo não encontrado. Confirma a rota do AuthController (ex: POST /api/Auth/register)."
    )
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

    // Profile extra (se for formador/formando)
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

    // validações profile
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
      // 1) Register (AuthController)
      const registerPayload = {
        Nome: nome,
        Email: email,
        Password: password,
      };

      const regRes = await registerUser(registerPayload);

      // 2) Descobrir o Id criado
      let createdUserId =
        regRes?.data?.id ??
        regRes?.data?.userId ??
        regRes?.data?.user?.id ??
        null;

      // Se não veio Id, recarrega users e encontra por email
      if (!createdUserId) {
        const listRes = await api.get("/Users");
        const arr = Array.isArray(listRes.data) ? listRes.data : [];
        const found = arr.find((u) => String(u.email || "").toLowerCase() === email.toLowerCase());
        if (!found?.id) {
          // Pelo menos atualiza a tabela e informa
          setUsers(arr);
          throw new Error("Utilizador criado mas não consegui obter o Id. Recarrega a página e procura pelo email.");
        }
        createdUserId = found.id;
        setUsers(arr);
      } else {
        // atualiza lista depois
        await loadUsers();
      }

      // 3) Set Role/IsActive
      await api.put(`/Users/${createdUserId}`, {
        Role: role,
        IsActive: !!create.isActive,
      });

      // 4) Criar profile (se aplicável)
      if (role === "Formador") {
        await api.post("/Profiles/formador", {
          UserId: createdUserId,
          AreaEspecializacao: (create.areaEspecializacao || "").trim(),
          CorCalendario: (create.corCalendario || "").trim(),
        });
      } else if (role === "Formando") {
        // DataNascimento: enviar "YYYY-MM-DD" (DB é DATE)
        await api.post("/Profiles/formando", {
          UserId: createdUserId,
          NumeroAluno: (create.numeroAluno || "").trim(),
          DataNascimento: create.dataNascimento, // "YYYY-MM-DD"
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="container mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Users</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Listar, editar Role/Ativo, apagar e criar utilizadores (com perfil opcional).
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
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={saving}
            >
              + Novo User
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
                placeholder="Pesquisar por ID, email ou role..."
                className="w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
              >
                <option value="Todos">Todos</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">Estado:</span>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
              >
                <option value="Todos">Todos</option>
                <option value="Ativos">Ativos</option>
                <option value="Inativos">Inativos</option>
              </select>

              <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                Total: <span className="font-semibold">{filtered.length}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm whitespace-pre-wrap">
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
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Email</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Role</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Ativo</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Flags</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                      A carregar...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                      Sem utilizadores para mostrar.
                    </td>
                  </tr>
                ) : (
                  filtered.map((u) => {
                    const isEditing = editingId === u.id;

                    return (
                      <tr key={u.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60">
                        <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{u.id}</td>

                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                          {u.email}
                        </td>

                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {isEditing ? (
                            <select
                              name="role"
                              value={edit.role}
                              onChange={onEditChange}
                              className="border rounded px-2 py-1
                                         bg-white dark:bg-gray-900 dark:border-gray-800
                                         text-gray-900 dark:text-gray-100"
                              disabled={saving}
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          ) : (
                            u.role || "—"
                          )}
                        </td>

                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          {isEditing ? (
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                name="isActive"
                                checked={!!edit.isActive}
                                onChange={onEditChange}
                                disabled={saving}
                              />
                              <span>{edit.isActive ? "Sim" : "Não"}</span>
                            </label>
                          ) : (
                            <span className={u.isActive ? "text-green-700 dark:text-green-300" : "text-gray-500 dark:text-gray-400"}>
                              {u.isActive ? "Sim" : "Não"}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                          <div className="flex flex-wrap gap-2">
                            {u.isFormador ? (
                              <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs dark:bg-blue-900/30 dark:text-blue-200">
                                Formador
                              </span>
                            ) : null}
                            {u.isFormando ? (
                              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-xs dark:bg-purple-900/30 dark:text-purple-200">
                                Formando
                              </span>
                            ) : null}
                            {!u.isFormador && !u.isFormando ? (
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs dark:bg-gray-800 dark:text-gray-200">
                                —
                              </span>
                            ) : null}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(u.id)}
                                  className="px-3 py-1.5 rounded text-sm font-medium text-green-700 hover:bg-green-50
                                             dark:text-green-300 dark:hover:bg-green-900/20 disabled:opacity-60"
                                  disabled={saving}
                                >
                                  Guardar
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="px-3 py-1.5 rounded text-sm font-medium text-gray-700 hover:bg-gray-50
                                             dark:text-gray-200 dark:hover:bg-gray-800 disabled:opacity-60"
                                  disabled={saving}
                                >
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(u)}
                                  className="px-3 py-1.5 rounded text-sm font-medium text-blue-700 hover:bg-blue-50
                                             dark:text-blue-300 dark:hover:bg-blue-900/20 disabled:opacity-60"
                                  disabled={saving}
                                >
                                  Editar
                                </button>
                                <button
                                  onClick={() => deleteUser(u.id)}
                                  className="px-3 py-1.5 rounded text-sm font-medium text-red-700 hover:bg-red-50
                                             dark:text-red-300 dark:hover:bg-red-900/20 disabled:opacity-60"
                                  disabled={saving}
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

        {/* Nota útil */}
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Nota: A criação usa o endpoint de registo do Auth. Se der 404, cola o método do AuthController e eu ajusto a rota certa.
        </div>
      </div>

      {/* Modal Create */}
      {showCreate && (
        <Modal title="Criar Utilizador" onClose={() => closeCreate(false)} disableClose={saving}>
          <form onSubmit={createUserFlow} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Nome</label>
              <input
                name="nome"
                value={create.nome}
                onChange={onCreateChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                disabled={saving}
                placeholder="Ex: João Silva"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Email</label>
              <input
                name="email"
                value={create.email}
                onChange={onCreateChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                disabled={saving}
                placeholder="exemplo@atec.pt"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Password</label>
              <input
                type="password"
                name="password"
                value={create.password}
                onChange={onCreateChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                disabled={saving}
                placeholder="mín. 6 caracteres"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Role</label>
              <select
                name="role"
                value={create.role}
                onChange={onCreateChange}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
                disabled={saving}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Se escolheres Formador/Formando, é criado o profile automaticamente.
              </p>
            </div>

            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={!!create.isActive}
                  onChange={onCreateChange}
                  disabled={saving}
                />
                Ativo
              </label>
            </div>

            {/* Extras Formador */}
            {create.role === "Formador" && (
              <>
                <div className="md:col-span-2">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Dados de Formador</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    (ProfilesController → POST /Profiles/formador)
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    Área de Especialização
                  </label>
                  <input
                    name="areaEspecializacao"
                    value={create.areaEspecializacao}
                    onChange={onCreateChange}
                    className="mt-1 w-full border rounded px-3 py-2
                               bg-white dark:bg-gray-900 dark:border-gray-800
                               text-gray-900 dark:text-gray-100"
                    disabled={saving}
                    placeholder="Ex: Redes / Programação / Segurança..."
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Cor Calendário</label>
                  <input
                    name="corCalendario"
                    value={create.corCalendario}
                    onChange={onCreateChange}
                    className="mt-1 w-full border rounded px-3 py-2
                               bg-white dark:bg-gray-900 dark:border-gray-800
                               text-gray-900 dark:text-gray-100"
                    disabled={saving}
                    placeholder="#RRGGBB"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Formato: #RRGGBB</p>
                </div>

                <div className="flex items-end">
                  <div
                    className="w-full h-10 rounded-lg border dark:border-gray-800"
                    style={{ background: create.corCalendario }}
                    title={create.corCalendario}
                  />
                </div>
              </>
            )}

            {/* Extras Formando */}
            {create.role === "Formando" && (
              <>
                <div className="md:col-span-2">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Dados de Formando</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    (ProfilesController → POST /Profiles/formando)
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Número Aluno</label>
                  <input
                    name="numeroAluno"
                    value={create.numeroAluno}
                    onChange={onCreateChange}
                    className="mt-1 w-full border rounded px-3 py-2
                               bg-white dark:bg-gray-900 dark:border-gray-800
                               text-gray-900 dark:text-gray-100"
                    disabled={saving}
                    placeholder="Ex: ATEC-12345"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Data Nascimento</label>
                  <input
                    type="date"
                    name="dataNascimento"
                    value={create.dataNascimento}
                    onChange={onCreateChange}
                    className="mt-1 w-full border rounded px-3 py-2
                               bg-white dark:bg-gray-900 dark:border-gray-800
                               text-gray-900 dark:text-gray-100"
                    disabled={saving}
                  />
                </div>
              </>
            )}

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => closeCreate(false)}
                className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-60
                           dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={saving}
              >
                {saving ? "A criar..." : "Criar"}
              </button>
            </div>
          </form>

          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Se isto der 404 no registo, cola o método do AuthController (Register) para eu meter a rota certa.
          </div>
        </Modal>
      )}
    </div>
  );
}
