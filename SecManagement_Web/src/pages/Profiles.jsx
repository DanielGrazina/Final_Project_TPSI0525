// src/pages/Profiles.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { getToken, getUserRoleFromToken } from "../utils/auth";

/* ---------------- helpers ---------------- */

function safeStr(x) {
  return (x ?? "").toString();
}

function safeUrl(x) {
  const s = safeStr(x).trim();
  if (!s) return "";
  return s;
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

// JWT decode sem libs
function decodeJwt(token) {
  try {
    const part = token.split(".")[1];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// tenta buscar UserId do token (suporta nameid / sub / etc.)
function getUserIdFromToken(token) {
  const p = decodeJwt(token);
  if (!p) return null;

  const candidates = [
    "nameid",
    "sub",
    "userId",
    "userid",
    "id",
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier",
  ];

  for (const k of candidates) {
    const v = p[k];
    if (v !== undefined && v !== null && safeStr(v).trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }

  const extra = ["unique_name", "sid"];
  for (const k of extra) {
    const v = p[k];
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }

  return null;
}

function SegmentTabs({ value, onChange, left, right }) {
  return (
    <div className="inline-flex rounded-lg border dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(left.value)}
        className={`px-4 py-2 text-sm font-medium transition-colors
          ${value === left.value ? "bg-blue-600 text-white" : "bg-transparent text-gray-300 hover:bg-white/10"}`}
      >
        {left.label}
      </button>
      <button
        type="button"
        onClick={() => onChange(right.value)}
        className={`px-4 py-2 text-sm font-medium transition-colors
          ${value === right.value ? "bg-blue-600 text-white" : "bg-transparent text-gray-300 hover:bg-white/10"}`}
      >
        {right.label}
      </button>
    </div>
  );
}

function Modal({ title, children, onClose, disabled }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !disabled && onClose()}
    >
      <div
        className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
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

function Avatar({ url, name, size = 44 }) {
  const s = Number(size);
  const initials = (safeStr(name).trim() || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const u = safeUrl(url);

  return (
    <div
      className="rounded-full overflow-hidden border border-white/10 bg-white/10 flex items-center justify-center flex-shrink-0"
      style={{ width: s, height: s }}
      title={safeStr(name)}
    >
      {u ? (
        // eslint-disable-next-line jsx-a11y/img-redundant-alt
        <img src={u} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs font-bold text-gray-200">{initials || "?"}</span>
      )}
    </div>
  );
}

/* ---------------- main page ---------------- */

export default function Profiles() {
  const navigate = useNavigate();

  const token = getToken();
  const role = getUserRoleFromToken(token) || "User";

  const myUserId = useMemo(() => (token ? getUserIdFromToken(token) : null), [token]);

  // Permissões
  const canManage = role === "Admin" || role === "Secretaria" || role === "SuperAdmin";

  // UI tabs
  const [tab, setTab] = useState("formandos"); // "formandos" | "formadores"

  // Data
  const [formandos, setFormandos] = useState([]);
  const [formadores, setFormadores] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // filtros
  const [search, setSearch] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  // detalhe selecionado
  const [selected, setSelected] = useState(null); // { type, data }
  const [openDetail, setOpenDetail] = useState(false);

  // edição dados pessoais
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: "",
    telefone: "",
    nif: "",
    morada: "",
    cc: "",
  });

  // upload ficheiros (docs) (admin/secretaria)
  const [uploading, setUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);

  // upload avatar (admin/secretaria)
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);

  async function loadAll() {
    setLoading(true);
    setError("");

    if (!token) {
      setError("Sem token. Faz login novamente.");
      setLoading(false);
      return;
    }

    if (!myUserId) {
      setError("Não consegui ler o teu UserId do token. Diz-me que claim está a vir no JWT.");
      setLoading(false);
      return;
    }

    try {
      if (canManage) {
        const results = await Promise.allSettled([api.get("/Profiles/formandos"), api.get("/Profiles/formadores")]);

        const [f1, f2] = results;

        if (f1.status === "fulfilled") setFormandos(Array.isArray(f1.value.data) ? f1.value.data : []);
        else setError((p) => p || extractError(f1.reason, "Falha ao carregar formandos."));

        if (f2.status === "fulfilled") setFormadores(Array.isArray(f2.value.data) ? f2.value.data : []);
        else setError((p) => p || extractError(f2.reason, "Falha ao carregar formadores."));
      } else {
        const wantsFormador = role === "Formador";
        if (wantsFormador) {
          const r = await api.get(`/Profiles/formador/${myUserId}`);
          setFormadores([r.data]);
          setFormandos([]);
          setTab("formadores");
        } else {
          const r = await api.get(`/Profiles/formando/${myUserId}`);
          setFormandos([r.data]);
          setFormadores([]);
          setTab("formandos");
        }
      }
    } catch (err) {
      setError(extractError(err, "Falha a carregar perfis."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // listas filtradas
  const filteredFormandos = useMemo(() => {
    const s = search.trim().toLowerCase();
    const t = turmaFilter.trim().toLowerCase();

    return formandos.filter((f) => {
      const id = safeStr(f.id);
      const userId = safeStr(f.userId);

      const nome = safeStr(f.nome ?? f.userNome ?? f.formandoNome ?? "");
      const email = safeStr(f.email ?? "");
      const numeroAluno = safeStr(f.numeroAluno ?? "");
      const turmaNome = safeStr(f.turmaNome ?? f.turmaAtualNome ?? "");
      const turmaId = safeStr(f.turmaId ?? f.turmaAtualId ?? "");

      const matchSearch =
        !s ||
        id.includes(s) ||
        userId.includes(s) ||
        nome.toLowerCase().includes(s) ||
        email.toLowerCase().includes(s) ||
        numeroAluno.toLowerCase().includes(s);

      const matchTurma = !t || turmaNome.toLowerCase().includes(t) || turmaId.toLowerCase().includes(t);

      return matchSearch && matchTurma;
    });
  }, [formandos, search, turmaFilter]);

  const filteredFormadores = useMemo(() => {
    const s = search.trim().toLowerCase();
    const a = areaFilter.trim().toLowerCase();

    return formadores.filter((f) => {
      const id = safeStr(f.id);
      const userId = safeStr(f.userId);

      const nome = safeStr(f.nome ?? "");
      const email = safeStr(f.email ?? "");
      const area = safeStr(f.areaEspecializacao ?? "");

      const matchSearch =
        !s || id.includes(s) || userId.includes(s) || nome.toLowerCase().includes(s) || email.toLowerCase().includes(s);

      const matchArea = !a || area.toLowerCase().includes(a);

      return matchSearch && matchArea;
    });
  }, [formadores, search, areaFilter]);

  function openProfile(type, data) {
    setSelected({ type, data });
    setOpenDetail(true);

    setEditForm({
      nome: safeStr(data.nome ?? data.userNome ?? ""),
      telefone: safeStr(data.telefone ?? ""),
      nif: safeStr(data.nif ?? ""),
      morada: safeStr(data.morada ?? ""),
      cc: safeStr(data.cc ?? ""),
    });

    setFileToUpload(null);
    setAvatarFile(null);
  }

  function closeDetail() {
    if (saving || uploading || avatarUploading) return;
    setOpenDetail(false);
    setSelected(null);
  }

  function patchSelectedAndLists(userId, patch) {
    const uid = Number(userId);

    // update selected
    setSelected((prev) => {
      if (!prev?.data) return prev;
      if (Number(prev.data.userId) !== uid) return prev;
      return { ...prev, data: { ...prev.data, ...patch } };
    });

    // update in lists
    setFormandos((prev) => prev.map((x) => (Number(x.userId) === uid ? { ...x, ...patch } : x)));
    setFormadores((prev) => prev.map((x) => (Number(x.userId) === uid ? { ...x, ...patch } : x)));
  }

  async function refreshSelected() {
    if (!selected?.data?.userId) return;

    const userId = selected.data.userId;
    const type = selected.type;

    try {
      if (type === "formador") {
        const r = await api.get(`/Profiles/formador/${userId}`);
        setFormadores((prev) => prev.map((x) => (Number(x.userId) === Number(userId) ? r.data : x)));
        setSelected({ type, data: r.data });
      } else {
        const r = await api.get(`/Profiles/formando/${userId}`);
        setFormandos((prev) => prev.map((x) => (Number(x.userId) === Number(userId) ? r.data : x)));
        setSelected({ type, data: r.data });
      }
    } catch (err) {
      setError(extractError(err, "Falha ao atualizar o perfil selecionado."));
    }
  }

  async function saveDadosPessoais(e) {
    e.preventDefault();
    if (!canManage) return;

    setError("");

    const userId = selected?.data?.userId;
    if (!userId) return;

    const payload = {
      nome: editForm.nome?.trim() || null,
      telefone: editForm.telefone?.trim() || null,
      nif: editForm.nif?.trim() || null,
      morada: editForm.morada?.trim() || null,
      cc: editForm.cc?.trim() || null,
    };

    setSaving(true);
    try {
      await api.put(`/Profiles/user/${userId}/dados`, payload);
      await refreshSelected();
    } catch (err) {
      setError(extractError(err, "Falha ao guardar dados pessoais."));
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar() {
    if (!canManage) return;

    const userId = selected?.data?.userId;
    if (!userId) return;

    if (!avatarFile) {
      setError("Seleciona uma imagem primeiro.");
      return;
    }

    // validação leve: imagens apenas
    if (!avatarFile.type?.startsWith("image/")) {
      setError("O avatar tem de ser uma imagem (png/jpg/webp).");
      return;
    }

    setError("");
    setAvatarUploading(true);

    try {
      const fd = new FormData();
      fd.append("Ficheiro", avatarFile);

      const res = await api.post(`/Profiles/user/${userId}/avatar`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const avatarUrl = res?.data?.avatarUrl || "";
      if (avatarUrl) {
        // Atualiza o UI imediatamente (mesmo que os GETs ainda não tragam avatar)
        patchSelectedAndLists(userId, { avatar: avatarUrl, avatarUrl });
      }

      setAvatarFile(null);

      // tenta refrescar do backend também
      await refreshSelected();
    } catch (err) {
      setError(extractError(err, "Falha ao atualizar avatar."));
    } finally {
      setAvatarUploading(false);
    }
  }

  async function downloadFile(fileId, fileName) {
    try {
      const res = await api.get(`/Profiles/file/${fileId}`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: res.headers["content-type"] || "application/octet-stream" });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || `ficheiro_${fileId}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(extractError(err, "Falha ao fazer download do ficheiro."));
    }
  }

  async function uploadFile() {
    if (!canManage) return;
    const userId = selected?.data?.userId;
    if (!userId) return;

    if (!fileToUpload) {
      setError("Seleciona um ficheiro primeiro.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("Ficheiro", fileToUpload);

      await api.post(`/Profiles/upload/${userId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFileToUpload(null);
      await refreshSelected();
    } catch (err) {
      setError(extractError(err, "Falha ao fazer upload."));
    } finally {
      setUploading(false);
    }
  }

  async function deleteFile(fileId) {
    if (!canManage) return;
    if (!window.confirm("Tens a certeza que queres apagar este ficheiro?")) return;

    setError("");
    try {
      await api.delete(`/Profiles/file/${fileId}`);
      await refreshSelected();
    } catch (err) {
      setError(extractError(err, "Falha ao apagar ficheiro."));
    }
  }

  async function openPdf() {
    const userId = selected?.data?.userId;
    if (!userId) return;

    const endpoint = selected.type === "formador" ? `/Profiles/formador/${userId}/pdf` : `/Profiles/formando/${userId}/pdf`;

    try {
      const res = await api.get(endpoint, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      setError(extractError(err, "Falha ao gerar ou abrir o PDF."));
    }
  }

  const list = tab === "formandos" ? filteredFormandos : filteredFormadores;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Profiles</h1>
            <p className="text-sm text-gray-300">
              {canManage ? "Ver, editar dados pessoais e gerir ficheiros/avatars." : "A tua informação (só leitura)."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <SegmentTabs
              value={tab}
              onChange={setTab}
              left={{ value: "formandos", label: "Formandos" }}
              right={{ value: "formadores", label: "Formadores" }}
            />

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
            >
              ← Voltar
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <div className="flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tab === "formandos"
                    ? "Pesquisar por nome, id, userId, email, nº aluno..."
                    : "Pesquisar por nome, id, userId, email..."
                }
                className="w-full px-4 py-2.5 rounded-lg border border-white/10 bg-gray-950
                           text-gray-100 placeholder:text-gray-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            {tab === "formandos" ? (
              <input
                value={turmaFilter}
                onChange={(e) => setTurmaFilter(e.target.value)}
                placeholder="Filtrar por turma (nome ou id)"
                className="w-full lg:w-[280px] px-4 py-2.5 rounded-lg border border-white/10 bg-gray-950
                           text-gray-100 placeholder:text-gray-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            ) : (
              <input
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                placeholder="Filtrar por área"
                className="w-full lg:w-[240px] px-4 py-2.5 rounded-lg border border-white/10 bg-gray-950
                           text-gray-100 placeholder:text-gray-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            )}

            <div className="px-3 py-2 rounded-lg bg-blue-600/20 border border-blue-500/30 text-sm font-semibold">
              {list.length} resultado{list.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* List */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-300">A carregar...</span>
            </div>
          ) : list.length === 0 ? (
            <div className="p-10 text-center text-gray-300">Sem dados.</div>
          ) : (
            <div className="divide-y divide-white/10">
              {list.map((item) => {
                const isFormando = tab === "formandos";
                const type = isFormando ? "formando" : "formador";

                const title = isFormando
                  ? safeStr(item.nome ?? item.formandoNome ?? "Formando")
                  : safeStr(item.nome ?? "Formador");

                const sub = isFormando
                  ? `UserId: ${item.userId} • Nº: ${safeStr(item.numeroAluno ?? "—")} • Email: ${safeStr(item.email ?? "—")}`
                  : `UserId: ${item.userId} • Área: ${safeStr(item.areaEspecializacao ?? "—")} • Email: ${safeStr(item.email ?? "—")}`;

                const avatarUrl = item.avatar ?? item.avatarUrl ?? item.userAvatar ?? item.user?.avatar;

                return (
                  <button
                    key={`${type}-${item.userId}-${item.id}`}
                    type="button"
                    onClick={() => openProfile(type, item)}
                    className="w-full text-left p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar url={avatarUrl} name={title} size={42} />

                        <div className="min-w-0">
                          <div className="font-semibold text-gray-100 truncate">{title}</div>
                          <div className="text-sm text-gray-400 mt-1 truncate">{sub}</div>
                        </div>
                      </div>

                      <div className="text-sm text-blue-300 font-semibold flex-shrink-0">Abrir →</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {openDetail && selected && (
        <Modal
          title={selected.type === "formador" ? "Profile — Formador" : "Profile — Formando"}
          onClose={closeDetail}
          disabled={saving || uploading || avatarUploading}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Info + Avatar + Files */}
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      url={selected.data.avatar ?? selected.data.avatarUrl ?? selected.data.userAvatar ?? selected.data.user?.avatar}
                      name={safeStr(selected.data.nome ?? selected.data.userNome ?? selected.data.formandoNome ?? "")}
                      size={56}
                    />

                    <div>
                      <div className="text-sm text-gray-400">Identificação</div>
                      <div className="mt-1 text-sm">
                        <div className="text-gray-100 font-semibold">
                          {safeStr(selected.data.nome ?? selected.data.userNome ?? selected.data.formandoNome ?? "—")}
                        </div>
                        <div className="text-gray-400">
                          UserId: <span className="text-gray-100 font-semibold">{safeStr(selected.data.userId)}</span>
                        </div>
                        <div className="text-gray-400">
                          Email: <span className="text-gray-100 font-semibold">{safeStr(selected.data.email ?? "—")}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Avatar Upload (Admin/Secretaria/SuperAdmin only) */}
                  {canManage && (
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-gray-400">Foto de perfil</div>
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer text-sm">
                          Escolher
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                            className="hidden"
                            disabled={avatarUploading}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={uploadAvatar}
                          disabled={avatarUploading || !avatarFile}
                          className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700
                                     disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {avatarUploading ? "A enviar..." : "Upload"}
                        </button>
                      </div>

                      {avatarFile && (
                        <div className="text-xs text-gray-400 max-w-[220px] truncate" title={avatarFile.name}>
                          {avatarFile.name}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-1 text-sm">
                  {selected.type === "formador" ? (
                    <>
                      <div>
                        <span className="text-gray-400">Telefone:</span>{" "}
                        <span className="text-gray-100 font-semibold">{safeStr(selected.data.telefone ?? "—")}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Área:</span>{" "}
                        <span className="text-gray-100 font-semibold">{safeStr(selected.data.areaEspecializacao ?? "—")}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Cor calendário:</span>{" "}
                        <span className="text-gray-100 font-semibold">{safeStr(selected.data.corCalendario ?? "—")}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-gray-400">Nº Aluno:</span>{" "}
                        <span className="text-gray-100 font-semibold">{safeStr(selected.data.numeroAluno ?? "—")}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Data nascimento:</span>{" "}
                        <span className="text-gray-100 font-semibold">
                          {selected.data.dataNascimento
                            ? new Date(selected.data.dataNascimento).toLocaleDateString("pt-PT")
                            : "—"}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {!canManage && (
                  <div className="mt-4 text-xs text-gray-400">
                    Nota: Formandos e Formadores não podem editar nem fazer upload (ficheiros/avatars).
                  </div>
                )}
              </div>

              {/* Files */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-gray-100">Ficheiros</div>
                    <div className="text-xs text-gray-400">Upload/Apagar só para Admin/Secretaria</div>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {(selected.data.ficheiros ?? []).length === 0 ? (
                    <div className="text-sm text-gray-400">Sem ficheiros.</div>
                  ) : (
                    (selected.data.ficheiros ?? []).map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg border border-white/10 bg-gray-950/40"
                      >
                        <div className="min-w-0">
                          <div className="text-sm text-gray-100 truncate">{safeStr(f.nomeFicheiro)}</div>
                          <div className="text-xs text-gray-500 truncate">{safeStr(f.contentType)}</div>
                        </div>

                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => downloadFile(f.id, f.nomeFicheiro)}
                            className="px-3 py-1.5 text-sm rounded-lg bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30"
                          >
                            Download
                          </button>

                          {canManage && (
                            <button
                              type="button"
                              onClick={() => deleteFile(f.id)}
                              className="px-3 py-1.5 text-sm rounded-lg bg-red-600/20 border border-red-500/30 hover:bg-red-600/30"
                            >
                              Apagar
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {canManage && (
                  <div className="mt-4 flex flex-col gap-2">
                    <input
                      type="file"
                      onChange={(e) => setFileToUpload(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-gray-300
                                 file:mr-4 file:py-2 file:px-4
                                 file:rounded-lg file:border-0
                                 file:text-sm file:font-semibold
                                 file:bg-white/10 file:text-gray-100
                                 hover:file:bg-white/15"
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      onClick={uploadFile}
                      disabled={uploading || !fileToUpload}
                      className="px-4 py-2 rounded-lg bg-green-600/20 border border-green-500/30 hover:bg-green-600/30
                                 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {uploading ? "A enviar..." : "Upload"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Edit */}
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-sm font-semibold text-gray-100">Dados pessoais</div>
                <div className="text-xs text-gray-400">{canManage ? "Admin/Secretaria podem editar." : "Só leitura."}</div>

                <form onSubmit={saveDadosPessoais} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Nome</label>
                    <input
                      value={editForm.nome}
                      onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))}
                      disabled={!canManage || saving}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-gray-950
                                 text-gray-100 placeholder:text-gray-500
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                      placeholder="Nome"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Telefone</label>
                      <input
                        value={editForm.telefone}
                        onChange={(e) => setEditForm((p) => ({ ...p, telefone: e.target.value }))}
                        disabled={!canManage || saving}
                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-gray-950
                                   text-gray-100 placeholder:text-gray-500
                                   focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                        placeholder="+351..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">NIF</label>
                      <input
                        value={editForm.nif}
                        onChange={(e) => setEditForm((p) => ({ ...p, nif: e.target.value }))}
                        disabled={!canManage || saving}
                        className="w-full px-3 py-2 rounded-lg border border-white/10 bg-gray-950
                                   text-gray-100 placeholder:text-gray-500
                                   focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                        placeholder="9 dígitos"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Morada</label>
                    <input
                      value={editForm.morada}
                      onChange={(e) => setEditForm((p) => ({ ...p, morada: e.target.value }))}
                      disabled={!canManage || saving}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-gray-950
                                 text-gray-100 placeholder:text-gray-500
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                      placeholder="Morada"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">CC</label>
                    <input
                      value={editForm.cc}
                      onChange={(e) => setEditForm((p) => ({ ...p, cc: e.target.value }))}
                      disabled={!canManage || saving}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-gray-950
                                 text-gray-100 placeholder:text-gray-500
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                      placeholder="Cartão de Cidadão"
                    />
                  </div>

                  {canManage && (
                    <button
                      type="submit"
                      disabled={saving}
                      className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold
                                 hover:bg-blue-700 transition-colors disabled:opacity-60"
                    >
                      {saving ? "A guardar..." : "Guardar dados pessoais"}
                    </button>
                  )}
                </form>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-sm font-semibold text-gray-100">PDF</div>
                <div className="text-xs text-gray-400">Relatório do perfil.</div>

                <div className="mt-3 flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={openPdf}
                    className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    Abrir PDF
                  </button>

                  <button
                    type="button"
                    onClick={refreshSelected}
                    className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    Atualizar dados
                  </button>
                </div>
              </div>

              {/* Só para segurança visual */}
              {!canManage && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-xs text-gray-400">
                  Estás em modo só leitura. Admin/Secretaria/SuperAdmin conseguem editar dados pessoais e gerir uploads.
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
