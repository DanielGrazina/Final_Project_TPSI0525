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
  return s || "";
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

/* ---------------- UI components (dashboard-like) ---------------- */

function HeaderIcon({ icon = "profile" }) {
  return (
    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
      {icon === "profile" ? (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 21a8 8 0 0 0-16 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M12 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z"
            stroke="currentColor"
            strokeWidth="2"
          />
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

function SegTabs({ value, onChange, left, right, disabled }) {
  const base =
    "px-4 py-2 text-sm font-semibold transition-colors border border-gray-200 dark:border-gray-700";
  const active = "bg-blue-600 text-white border-blue-600";
  const idle =
    "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800";

  return (
    <div className="inline-flex rounded-lg overflow-hidden">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(left.value)}
        className={[base, value === left.value ? active : idle].join(" ")}
      >
        {left.label}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(right.value)}
        className={[base, value === right.value ? active : idle].join(" ")}
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
        className="w-full max-w-5xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
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
      className="rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0"
      style={{ width: s, height: s }}
      title={safeStr(name)}
    >
      {u ? (
        <img src={u} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <span className="text-xs font-black text-gray-700 dark:text-gray-200">{initials || "?"}</span>
      )}
    </div>
  );
}

/* ---------------- Pagination ---------------- */

function PaginationBar({ total, page, pageSize, onPageChange, onPageSizeChange, disabled }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(total, safePage * pageSize);

  const pagesToShow = (() => {
    const win = 7;
    const half = Math.floor(win / 2);
    let start = Math.max(1, safePage - half);
    let end = Math.min(totalPages, start + win - 1);
    start = Math.max(1, end - win + 1);
    const arr = [];
    for (let p = start; p <= end; p++) arr.push(p);
    return arr;
  })();

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          A mostrar{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">{from}</span>–{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">{to}</span> de{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">{total}</span>
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

      <div className="flex items-center gap-2 flex-wrap">
        <Btn onClick={() => onPageChange(1)} disabled={disabled || safePage === 1}>
          «
        </Btn>
        <Btn onClick={() => onPageChange(safePage - 1)} disabled={disabled || safePage === 1}>
          ‹
        </Btn>

        {pagesToShow[0] > 1 && (
          <>
            <Btn onClick={() => onPageChange(1)} disabled={disabled}>
              1
            </Btn>
            <span className="text-gray-400 px-1">…</span>
          </>
        )}

        {pagesToShow.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            disabled={disabled}
            className={[
              "px-3 py-1.5 rounded-lg border text-sm font-semibold transition",
              "active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
              p === safePage
                ? "bg-blue-600 text-white border-blue-600"
                : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-800",
            ].join(" ")}
          >
            {p}
          </button>
        ))}

        {pagesToShow[pagesToShow.length - 1] < totalPages && (
          <>
            <span className="text-gray-400 px-1">…</span>
            <Btn onClick={() => onPageChange(totalPages)} disabled={disabled}>
              {totalPages}
            </Btn>
          </>
        )}

        <Btn onClick={() => onPageChange(safePage + 1)} disabled={disabled || safePage === totalPages}>
          ›
        </Btn>
        <Btn onClick={() => onPageChange(totalPages)} disabled={disabled || safePage === totalPages}>
          »
        </Btn>
      </div>
    </div>
  );
}

/* ---------------- main page ---------------- */

export default function Profiles() {
  const navigate = useNavigate();

  const token = getToken();
  const role = getUserRoleFromToken(token) || "User";
  const myUserId = useMemo(() => (token ? getUserIdFromToken(token) : null), [token]);

  const canManage = role === "Admin" || role === "Secretaria" || role === "SuperAdmin";

  const [tab, setTab] = useState("formandos"); // "formandos" | "formadores"

  const [formandos, setFormandos] = useState([]);
  const [formadores, setFormadores] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [search, setSearch] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [selected, setSelected] = useState(null); // { type, data }
  const [openDetail, setOpenDetail] = useState(false);

  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    nome: "",
    telefone: "",
    nif: "",
    morada: "",
    cc: "",
  });

  const [uploading, setUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);

  async function loadAll() {
    setLoading(true);
    setError("");
    setInfo("");

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
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const list = tab === "formandos" ? filteredFormandos : filteredFormadores;

  useEffect(() => {
    setPage(1);
  }, [tab, search, turmaFilter, areaFilter, pageSize]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(list.length / pageSize)), [list.length, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedList = useMemo(() => {
    const start = (page - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }, [list, page, pageSize]);

  function openProfile(type, data) {
    setSelected({ type, data });
    setOpenDetail(true);
    setInfo("");
    setError("");

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
    setInfo("");
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
      setInfo("Dados atualizados.");
      setTimeout(() => setInfo(""), 1200);
    } catch (err) {
      setError(extractError(err, "Falha ao atualizar o perfil selecionado."));
    }
  }

  async function saveDadosPessoais(e) {
    e.preventDefault();
    if (!canManage) return;

    setError("");
    setInfo("");

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
      setInfo("Dados guardados.");
      setTimeout(() => setInfo(""), 1200);
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

    if (!avatarFile.type?.startsWith("image/")) {
      setError("O avatar tem de ser uma imagem (png/jpg/webp).");
      return;
    }

    setError("");
    setInfo("");
    setAvatarUploading(true);

    try {
      const fd = new FormData();
      fd.append("Ficheiro", avatarFile);

      await api.post(`/Profiles/user/${userId}/avatar`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setAvatarFile(null);
      await refreshSelected();
      setInfo("Avatar atualizado.");
      setTimeout(() => setInfo(""), 1200);
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
    setInfo("");
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append("Ficheiro", fileToUpload);

      await api.post(`/Profiles/upload/${userId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setFileToUpload(null);
      await refreshSelected();
      setInfo("Upload concluído.");
      setTimeout(() => setInfo(""), 1200);
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
    setInfo("");

    try {
      await api.delete(`/Profiles/file/${fileId}`);
      await refreshSelected();
      setInfo("Ficheiro apagado.");
      setTimeout(() => setInfo(""), 1200);
    } catch (err) {
      setError(extractError(err, "Falha ao apagar ficheiro."));
    }
  }

  async function openPdf() {
    const userId = selected?.data?.userId;
    if (!userId) return;

    const endpoint =
      selected.type === "formador" ? `/Profiles/formador/${userId}/pdf` : `/Profiles/formando/${userId}/pdf`;

    try {
      const res = await api.get(endpoint, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      setError(extractError(err, "Falha ao gerar ou abrir o PDF."));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur-xl dark:bg-gray-900/90 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <HeaderIcon icon="profile" />
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Profiles</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {canManage ? "Ver, editar dados pessoais e gerir ficheiros/avatars." : "A tua informação (só leitura)."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <SegTabs
              value={tab}
              onChange={setTab}
              disabled={!canManage && true}
              left={{ value: "formandos", label: "Formandos" }}
              right={{ value: "formadores", label: "Formadores" }}
            />

            <Btn onClick={() => navigate("/dashboard")}>← Voltar</Btn>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
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
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800
                           bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>

            {tab === "formandos" ? (
              <input
                value={turmaFilter}
                onChange={(e) => setTurmaFilter(e.target.value)}
                placeholder="Filtrar por turma (nome ou id)"
                className="w-full lg:w-[280px] px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800
                           bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            ) : (
              <input
                value={areaFilter}
                onChange={(e) => setAreaFilter(e.target.value)}
                placeholder="Filtrar por área"
                className="w-full lg:w-[240px] px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-800
                           bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            )}

            <div className="px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50">
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {list.length} resultado{list.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

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

        {/* List */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">A carregar...</span>
            </div>
          ) : list.length === 0 ? (
            <div className="p-10 text-center text-gray-600 dark:text-gray-400">Sem dados.</div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {pagedList.map((item) => {
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
                    className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar url={avatarUrl} name={title} size={44} />

                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 dark:text-gray-100 truncate">{title}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{sub}</div>
                        </div>
                      </div>

                      <div className="text-sm text-blue-600 dark:text-blue-400 font-semibold flex-shrink-0">
                        Abrir →
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <PaginationBar
            total={list.length}
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

      {/* Detail Modal */}
      {openDetail && selected && (
        <Modal
          title={selected.type === "formador" ? "Profile — Formador" : "Profile — Formando"}
          onClose={() => {
            if (saving || uploading || avatarUploading) return;
            setOpenDetail(false);
            setSelected(null);
            setInfo("");
          }}
          disabled={saving || uploading || avatarUploading}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT */}
            <div className="space-y-4">
              {/* Identity */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar
                      url={
                        selected.data.avatar ??
                        selected.data.avatarUrl ??
                        selected.data.userAvatar ??
                        selected.data.user?.avatar
                      }
                      name={safeStr(selected.data.nome ?? selected.data.userNome ?? selected.data.formandoNome ?? "")}
                      size={60}
                    />
                    <div>
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Identificação</div>
                      <div className="mt-1 text-sm">
                        <div className="text-gray-900 dark:text-gray-100 font-bold">
                          {safeStr(selected.data.nome ?? selected.data.userNome ?? selected.data.formandoNome ?? "—")}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          UserId:{" "}
                          <span className="text-gray-900 dark:text-gray-100 font-semibold">
                            {safeStr(selected.data.userId)}
                          </span>
                        </div>
                        <div className="text-gray-600 dark:text-gray-400">
                          Email:{" "}
                          <span className="text-gray-900 dark:text-gray-100 font-semibold">
                            {safeStr(selected.data.email ?? "—")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Foto de perfil</div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <label className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900
                                           text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer text-sm font-semibold">
                          Escolher
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                            className="hidden"
                            disabled={avatarUploading}
                          />
                        </label>

                        <PrimaryBtn
                          tone="blue"
                          onClick={uploadAvatar}
                          disabled={avatarUploading || !avatarFile}
                        >
                          {avatarUploading ? "A enviar..." : "Upload"}
                        </PrimaryBtn>
                      </div>

                      {avatarFile && (
                        <div
                          className="text-xs text-gray-500 dark:text-gray-400 max-w-[240px] truncate"
                          title={avatarFile.name}
                        >
                          {avatarFile.name}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-1 text-sm">
                  {selected.type === "formador" ? (
                    <>
                      <div className="text-gray-700 dark:text-gray-300">
                        <span className="text-gray-500 dark:text-gray-400">Telefone:</span>{" "}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {safeStr(selected.data.telefone ?? "—")}
                        </span>
                      </div>
                      <div className="text-gray-700 dark:text-gray-300">
                        <span className="text-gray-500 dark:text-gray-400">Área:</span>{" "}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {safeStr(selected.data.areaEspecializacao ?? "—")}
                        </span>
                      </div>
                      <div className="text-gray-700 dark:text-gray-300">
                        <span className="text-gray-500 dark:text-gray-400">Cor calendário:</span>{" "}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {safeStr(selected.data.corCalendario ?? "—")}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-gray-700 dark:text-gray-300">
                        <span className="text-gray-500 dark:text-gray-400">Nº Aluno:</span>{" "}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {safeStr(selected.data.numeroAluno ?? "—")}
                        </span>
                      </div>
                      <div className="text-gray-700 dark:text-gray-300">
                        <span className="text-gray-500 dark:text-gray-400">Data nascimento:</span>{" "}
                        <span className="font-semibold text-gray-900 dark:text-gray-100">
                          {selected.data.dataNascimento
                            ? new Date(selected.data.dataNascimento).toLocaleDateString("pt-PT")
                            : "—"}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {!canManage && (
                  <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                    Nota: estás em modo só leitura.
                  </div>
                )}
              </div>

              {/* Files */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-black text-gray-900 dark:text-gray-100">Ficheiros</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Upload/Apagar só para Admin/Secretaria/SuperAdmin
                    </div>
                  </div>

                  <Btn tone="blue" onClick={refreshSelected}>
                    Atualizar
                  </Btn>
                </div>

                <div className="mt-4 space-y-2">
                  {(selected.data.ficheiros ?? []).length === 0 ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">Sem ficheiros.</div>
                  ) : (
                    (selected.data.ficheiros ?? []).map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center justify-between gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/40"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {safeStr(f.nomeFicheiro)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {safeStr(f.contentType)}
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap justify-end">
                          <Btn tone="blue" onClick={() => downloadFile(f.id, f.nomeFicheiro)}>
                            Download
                          </Btn>

                          {canManage && (
                            <Btn tone="red" onClick={() => deleteFile(f.id)}>
                              Apagar
                            </Btn>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {canManage && (
                  <div className="mt-4 space-y-3">
                    <input
                      type="file"
                      onChange={(e) => setFileToUpload(e.target.files?.[0] ?? null)}
                      disabled={uploading}
                      className="block w-full text-sm text-gray-700 dark:text-gray-300
                                 file:mr-4 file:py-2 file:px-4
                                 file:rounded-lg file:border-0
                                 file:text-sm file:font-semibold
                                 file:bg-gray-100 file:text-gray-800
                                 dark:file:bg-gray-800 dark:file:text-gray-100
                                 hover:file:bg-gray-200 dark:hover:file:bg-gray-700"
                    />

                    <PrimaryBtn tone="green" onClick={uploadFile} disabled={uploading || !fileToUpload}>
                      {uploading ? "A enviar..." : "Upload"}
                    </PrimaryBtn>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-4">
              {/* Personal data */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <div className="text-sm font-black text-gray-900 dark:text-gray-100">Dados pessoais</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {canManage ? "Admin/Secretaria podem editar." : "Só leitura."}
                </div>

                <form onSubmit={saveDadosPessoais} className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Nome</label>
                    <input
                      value={editForm.nome}
                      onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))}
                      disabled={!canManage || saving}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                                 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                      placeholder="Nome"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Telefone</label>
                      <input
                        value={editForm.telefone}
                        onChange={(e) => setEditForm((p) => ({ ...p, telefone: e.target.value }))}
                        disabled={!canManage || saving}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                                   bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                                   focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                        placeholder="+351..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">NIF</label>
                      <input
                        value={editForm.nif}
                        onChange={(e) => setEditForm((p) => ({ ...p, nif: e.target.value }))}
                        disabled={!canManage || saving}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                                   bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                                   focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                        placeholder="9 dígitos"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Morada</label>
                    <input
                      value={editForm.morada}
                      onChange={(e) => setEditForm((p) => ({ ...p, morada: e.target.value }))}
                      disabled={!canManage || saving}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                                 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                      placeholder="Morada"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">CC</label>
                    <input
                      value={editForm.cc}
                      onChange={(e) => setEditForm((p) => ({ ...p, cc: e.target.value }))}
                      disabled={!canManage || saving}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800
                                 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                                 focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                      placeholder="Cartão de Cidadão"
                    />
                  </div>

                  {canManage && (
                    <PrimaryBtn tone="blue" type="submit" disabled={saving} className="w-full">
                      {saving ? "A guardar..." : "Guardar dados pessoais"}
                    </PrimaryBtn>
                  )}
                </form>
              </div>

              {/* PDF */}
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
                <div className="text-sm font-black text-gray-900 dark:text-gray-100">PDF</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Relatório do perfil.</div>

                <div className="mt-4 flex gap-2 flex-wrap">
                  <PrimaryBtn tone="blue" onClick={openPdf}>
                    Abrir PDF
                  </PrimaryBtn>
                  <Btn tone="neutral" onClick={refreshSelected}>
                    Atualizar dados
                  </Btn>
                </div>
              </div>

              {!canManage && (
                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 text-xs text-gray-600 dark:text-gray-400">
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
