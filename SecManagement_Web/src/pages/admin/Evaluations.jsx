import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getToken, getUserRoleFromToken, decodeJwt } from "../../utils/auth";
import BurgerMenu from "../../components/BurgerMenu";


function Modal({ title, children, onClose, disabled }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !disabled && onClose()}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border dark:border-gray-800 animate-in fade-in zoom-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-t-2xl">
          <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            disabled={disabled}
            className="p-2 rounded-lg border hover:bg-gray-100 disabled:opacity-60 transition-colors
                       dark:border-gray-700 dark:hover:bg-gray-800"
            type="button"
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

/* ---------------- helpers ---------------- */

function safeStr(x) {
  return (x ?? "").toString();
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

function Gradebadge({ grade }) {
  if (grade === null || grade === undefined || grade === "") {
    return <span className="text-gray-400 dark:text-gray-600">—</span>;
  }

  const numGrade = Number(grade);
  let color = "gray";

  if (Number.isFinite(numGrade)) {
    if (numGrade >= 18) color = "green";
    else if (numGrade >= 14) color = "blue";
    else if (numGrade >= 10) color = "amber";
    else color = "red";
  }

  const colors = {
    green:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    blue: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    amber:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
    red: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    gray: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold border ${colors[color]}`}>
      {grade}
    </span>
  );
}

// tenta GET em várias rotas até uma funcionar (404 -> tenta próxima)
async function tryGetFirst(paths) {
  let lastErr = null;
  for (const p of paths) {
    try {
      return await api.get(p);
    } catch (err) {
      if (err?.response?.status === 404) {
        lastErr = err;
        continue;
      }
      throw err;
    }
  }
  throw lastErr || new Error("Nenhum endpoint disponível.");
}

function getClaimNumber(payload, keys) {
  if (!payload) return null;
  for (const k of keys) {
    const v = payload[k];
    if (v != null && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

export default function Evaluations() {
  const navigate = useNavigate();

  // Se no Swagger estiver /Evaluations em vez de /Avaliacoes, muda só esta linha:
  const BASE = "/Avaliacoes";

  const token = getToken();
  const roleRaw = useMemo(() => (token ? getUserRoleFromToken(token) : ""), [token]);
  const roleLower = String(roleRaw || "").trim().toLowerCase();

  const payload = useMemo(() => (token ? decodeJwt(token) : null), [token]);

  // claims (do teu AuthService):
  // - "FormandoId", "FormadorId"
  const formandoId = useMemo(
    () => getClaimNumber(payload, ["FormandoId", "formandoId", "idFormando", "IdFormando"]),
    [payload]
  );
  const formadorId = useMemo(
    () => getClaimNumber(payload, ["FormadorId", "formadorId", "idFormador", "IdFormador"]),
    [payload]
  );

  // roles
  const isAluno = roleLower === "formando" || roleLower === "user";
  const isFormador = roleLower === "formador";
  const isAdminLike = roleLower === "admin" || roleLower === "secretaria" || roleLower === "superadmin";

  const [avaliacoes, setAvaliacoes] = useState([]);
  const [turmas, setTurmas] = useState([]);

  // dependências do form (alunos/módulos por turma)
  const [inscricoes, setInscricoes] = useState([]);
  const [turmaModulos, setTurmaModulos] = useState([]);

  // formador: turmas permitidas
  const [allowedTurmaIds, setAllowedTurmaIds] = useState(new Set());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("Todos");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    turmaId: "",
    inscricaoId: "",
    turmaModuloId: "",
    avaliacao: "",
    observacoes: "",
  });

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
  }, [token, navigate]);

  async function loadTurmasBase() {
    try {
      const res = await api.get("/Turmas");
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  }

  // tenta descobrir turmas do formador (se houver endpoint)
  async function loadTurmasDoFormador() {
    if (!isFormador || !formadorId) {
      setAllowedTurmaIds(new Set());
      return;
    }

    const candidates = [
      `/Turmas/formador/${formadorId}`,
      `/Formadores/${formadorId}/turmas`,
      `/Turmas/me`, // se tiveres endpoint "as minhas turmas"
    ];

    try {
      const r = await tryGetFirst(candidates);
      const list = Array.isArray(r.data) ? r.data : [];
      const ids = new Set(list.map((t) => Number(t.id)).filter((x) => Number.isFinite(x)));
      setAllowedTurmaIds(ids);
    } catch (err) {
      setAllowedTurmaIds(new Set());
    }
  }

  // carregar avaliações com regras e fallback
  async function loadAvaliacoes() {
    // ALUNO: só as dele
    if (isAluno) {
      if (!formandoId) {
        throw new Error("Não encontrei o FormandoId no token. Confirma a claim 'FormandoId' no JWT.");
      }

      // tenta endpoints dedicados
      try {
        const res = await tryGetFirst([
          `${BASE}/aluno/${formandoId}`,
          `${BASE}/formando/${formandoId}`,
          `${BASE}?formandoId=${formandoId}`,
          `${BASE}?FormandoId=${formandoId}`,
        ]);
        return Array.isArray(res.data) ? res.data : [];
      } catch {
        // fallback: GET all + filtrar localmente pelo formandoId
        const all = await api.get(BASE);
        const list = Array.isArray(all.data) ? all.data : [];

        return list.filter((a) => {
          const fid =
            a.formandoId ??
            a.FormandoId ??
            a.alunoId ??
            a.AlunoId ??
            a.formando?.id ??
            null;
          return Number(fid) === Number(formandoId);
        });
      }
    }

    // ADMIN-LIKE: tudo
    if (isAdminLike) {
      const res = await api.get(BASE);
      return Array.isArray(res.data) ? res.data : [];
    }

    // FORMADOR: só turmas dele
    if (isFormador) {
      // tenta endpoint dedicado primeiro
      if (formadorId) {
        try {
          const r = await tryGetFirst([
            `${BASE}/formador/${formadorId}`,
            `${BASE}?formadorId=${formadorId}`,
            `${BASE}?FormadorId=${formadorId}`,
          ]);
          const list = Array.isArray(r.data) ? r.data : [];
          return list;
        } catch {
          // continua para fallback abaixo
        }
      }

      // fallback: GET all + filtrar por turmas permitidas
      const res = await api.get(BASE);
      const list = Array.isArray(res.data) ? res.data : [];

      if (allowedTurmaIds.size === 0) {
        setError(
          "Como Formador, preciso do endpoint para saber as tuas turmas (ex: GET /Turmas/formador/{id}). Sem isso, por segurança não posso listar avaliações."
        );
        return [];
      }

      return list.filter((a) => allowedTurmaIds.has(Number(a.turmaId)));
    }

    return [];
  }

  // carregar tudo
  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      if (isFormador) {
        await loadTurmasDoFormador();
      }

      const [aList, tList] = await Promise.all([loadAvaliacoes(), loadTurmasBase()]);

      setAvaliacoes(Array.isArray(aList) ? aList : []);
      setTurmas(Array.isArray(tList) ? tList : []);
    } catch (err) {
      setAvaliacoes([]);
      setTurmas([]);
      setError(extractError(err, "Falha ao carregar dados."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLower]);

  async function loadTurmaDependencias(turmaId) {
    setInscricoes([]);
    setTurmaModulos([]);

    if (!turmaId) return;

    // regra: se for formador, só pode escolher turmas dele
    if (isFormador && allowedTurmaIds.size > 0 && !allowedTurmaIds.has(Number(turmaId))) {
      setError("Não tens permissões para aceder a esta turma.");
      return;
    }

    try {
      // ajusta estas rotas se o teu backend tiver nomes diferentes
      const [iRes, mRes] = await Promise.all([
        api.get(`/Turmas/${turmaId}/alunos`),
        api.get(`/Turmas/${turmaId}/modulos`),
      ]);

      setInscricoes(Array.isArray(iRes.data) ? iRes.data : []);
      setTurmaModulos(Array.isArray(mRes.data) ? mRes.data : []);
    } catch (err) {
      setError(extractError(err, "Falha a carregar alunos/módulos da turma."));
    }
  }

  // stats (o aluno só vê as dele; formador/admin vêem as que estão listadas)
  const stats = useMemo(() => {
    const total = avaliacoes.length;
    const onlyWithGrade = avaliacoes.filter(
      (a) => a.avaliacao !== null && a.avaliacao !== undefined && a.avaliacao !== ""
    );
    const withGrades = onlyWithGrade.length;
    const avgGrade =
      withGrades > 0
        ? (onlyWithGrade.reduce((sum, a) => sum + Number(a.avaliacao), 0) / withGrades).toFixed(1)
        : "—";

    // Média por turma selecionada (para formador)
    let avgLabel = "Média";
    let avgValue = avgGrade;

    if (isAluno) {
      avgLabel = "A Minha Média";
      // avgValue já está correto (dados filtrados por aluno no backend)
    } else if (isFormador) {
      if (turmaFilter !== "Todos") {
        const turmaGrades = onlyWithGrade.filter((a) => Number(a.turmaId) === Number(turmaFilter));
        avgValue = turmaGrades.length > 0
          ? (turmaGrades.reduce((sum, a) => sum + Number(a.avaliacao), 0) / turmaGrades.length).toFixed(1)
          : "—";
        const turmaObj = turmas.find((t) => Number(t.id) === Number(turmaFilter));
        avgLabel = turmaObj ? `Média (${turmaObj.nome})` : "Média (Turma)";
      } else {
        avgLabel = "Média (todas as turmas)";
      }
    }
    // admin/secretaria: mantém "Média" global

    return { total, withGrades, avgGrade: avgValue, avgLabel };
  }, [avaliacoes, turmas, turmaFilter, isAluno, isFormador]);

  const turmasParaSelect = useMemo(() => {
    // Formando: only turmas they have evaluations in
    if (isAluno) {
      const turmaIdsComAvaliacoes = new Set(
        avaliacoes.map((a) => Number(a.turmaId)).filter((x) => Number.isFinite(x))
      );
      return turmas.filter((t) => turmaIdsComAvaliacoes.has(Number(t.id)));
    }
    // Formador: only turmas they teach
    if (isFormador) {
      if (allowedTurmaIds.size > 0) {
        return turmas.filter((t) => allowedTurmaIds.has(Number(t.id)));
      }
      // fallback: only turmas that appear in their evaluation data
      const turmaIdsComAvaliacoes = new Set(
        avaliacoes.map((a) => Number(a.turmaId)).filter((x) => Number.isFinite(x))
      );
      return turmas.filter((t) => turmaIdsComAvaliacoes.has(Number(t.id)));
    }
    // Admin/Secretaria: all
    return turmas;
  }, [turmas, avaliacoes, isAluno, isFormador, allowedTurmaIds]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    return avaliacoes.filter((a) => {
      const turmaNome = (
        turmas.find((t) => Number(t.id) === Number(a.turmaId))?.nome ??
        a.turmaNome ??
        ""
      ).toLowerCase();

      const alunoNome = (a.formandoNome ?? a.alunoNome ?? a.userNome ?? a.nome ?? "").toLowerCase();
      const moduloNome = (a.moduloNome ?? "").toLowerCase();

      const matchesSearch =
        !s ||
        safeStr(a.id).includes(s) ||
        safeStr(a.turmaId).includes(s) ||
        turmaNome.includes(s) ||
        safeStr(a.inscricaoId).includes(s) ||
        alunoNome.includes(s) ||
        safeStr(a.turmaModuloId).includes(s) ||
        moduloNome.includes(s) ||
        safeStr(a.avaliacao).toLowerCase().includes(s);

      const matchesTurma = turmaFilter === "Todos" ? true : Number(turmaFilter) === Number(a.turmaId);

      return matchesSearch && matchesTurma;
    });
  }, [avaliacoes, turmas, search, turmaFilter]);

  useEffect(() => setPage(1), [search, turmaFilter]);

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
    // aluno não cria avaliações
    if (isAluno) {
      alert("Como formando, só podes consultar as tuas avaliações.");
      return;
    }

    setEditing(null);
    setForm({ turmaId: "", inscricaoId: "", turmaModuloId: "", avaliacao: "", observacoes: "" });
    setInscricoes([]);
    setTurmaModulos([]);
    setShowForm(true);
  }

  async function openEdit(a) {
    // aluno não edita avaliações
    if (isAluno) {
      alert("Como formando, não podes editar avaliações.");
      return;
    }

    // formador só edita se for da sua turma
    if (isFormador && allowedTurmaIds.size > 0 && !allowedTurmaIds.has(Number(a.turmaId))) {
      alert("Não tens permissões para editar avaliações fora das tuas turmas.");
      return;
    }

    setEditing(a);

    const turmaId = String(a.turmaId ?? "");
    setForm({
      turmaId,
      inscricaoId: String(a.inscricaoId ?? ""),
      turmaModuloId: String(a.turmaModuloId ?? ""),
      avaliacao: a.avaliacao ?? "",
      observacoes: a.observacoes ?? "",
    });

    setShowForm(true);
    await loadTurmaDependencias(turmaId);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
  }

  function onChange(e) {
    const { name, value } = e.target;

    if (name === "turmaId") {
      // formador só escolhe turmas dele
      if (isFormador && allowedTurmaIds.size > 0 && value && !allowedTurmaIds.has(Number(value))) {
        alert("Não tens permissões para essa turma.");
        return;
      }

      setForm((p) => ({ ...p, turmaId: value, inscricaoId: "", turmaModuloId: "" }));
      loadTurmaDependencias(value);
      return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  }

  function getTurmaNome(turmaId) {
    const t = turmas.find((x) => Number(x.id) === Number(turmaId));
    return t?.nome ?? `#${turmaId}`;
  }

  function getInscricaoLabel(i) {
    const id = i.id ?? i.inscricaoId ?? "";
    const nome = i.formandoNome ?? i.alunoNome ?? i.userNome ?? i.nome ?? i.email ?? "";
    return nome ? `${nome} (ID ${id})` : `Inscrição #${id}`;
  }

  function getTurmaModuloLabel(tm) {
    const id = tm.id ?? "";
    const mod = tm.moduloNome ?? tm.modulo?.nome ?? "Módulo";
    const formador = tm.formadorNome ? ` — ${tm.formadorNome}` : "";
    const seq = (tm.sequencia ?? null) !== null ? ` (Seq ${tm.sequencia})` : "";
    return `${mod}${seq}${formador} [ID ${id}]`;
  }

  async function saveEvaluation(e) {
    e.preventDefault();
    setError("");

    if (isAluno) {
      setError("Como formando, não podes criar/editar avaliações.");
      return;
    }

    const turmaIdNum = Number(form.turmaId);
    const inscricaoIdNum = Number(form.inscricaoId);
    const turmaModuloIdNum = Number(form.turmaModuloId);

    if (!Number.isFinite(turmaIdNum) || turmaIdNum <= 0) return alert("Seleciona uma turma.");
    if (!Number.isFinite(inscricaoIdNum) || inscricaoIdNum <= 0) return alert("Seleciona um aluno/inscrição.");
    if (!Number.isFinite(turmaModuloIdNum) || turmaModuloIdNum <= 0) return alert("Seleciona um módulo da turma.");

    // formador: valida turma permitida
    if (isFormador && allowedTurmaIds.size > 0 && !allowedTurmaIds.has(Number(turmaIdNum))) {
      alert("Não tens permissões para criar/editar avaliações fora das tuas turmas.");
      return;
    }

    const avaliacaoNum =
      form.avaliacao === "" || form.avaliacao === null ? null : Number(String(form.avaliacao).replace(",", "."));

    if (avaliacaoNum !== null && !Number.isFinite(avaliacaoNum)) return alert("A avaliação tem de ser um número.");

    const payload = {
      turmaId: turmaIdNum,
      inscricaoId: inscricaoIdNum,
      turmaModuloId: turmaModuloIdNum,
      avaliacao: avaliacaoNum,
      observacoes: form.observacoes?.trim() || null,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`${BASE}/${editing.id}`, payload);
      } else {
        await api.post(BASE, payload);
      }

      closeForm();
      await loadAll();
    } catch (err) {
      setError(extractError(err, "Falha ao guardar avaliação."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvaluation(id, turmaId) {
    if (isAluno) {
      alert("Como formando, não podes apagar avaliações.");
      return;
    }

    if (isFormador && allowedTurmaIds.size > 0 && !allowedTurmaIds.has(Number(turmaId))) {
      alert("Não tens permissões para apagar avaliações fora das tuas turmas.");
      return;
    }

    if (!window.confirm("Tens a certeza que queres apagar esta avaliação?")) return;

    setError("");
    try {
      await api.delete(`${BASE}/${id}`);
      setAvaliacoes((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      setError(extractError(err, "Falha ao apagar avaliação."));
    }
  }

  const canManage = isAdminLike || isFormador;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl dark:bg-gray-900/90 border-b dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          {/* Header row: title | actions */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* LEFT */}
            <div className="flex items-center gap-3">
              <BurgerMenu />

              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>

              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Avaliações</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isAluno
                    ? "Consulta apenas as tuas avaliações"
                    : isFormador
                      ? "Gerir avaliações apenas das tuas turmas"
                      : "Gestão global de avaliações"}
                </p>
              </div>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-5 py-2.5 rounded-xl border transition-all font-semibold
                          border-white/10 text-gray-900 hover:bg-gray-50
                          dark:text-white dark:hover:bg-white/10 dark:bg-white/5 dark:border-white/10
                          active:scale-[0.98]"
                type="button"
              >
                ← Voltar
              </button>

              {canManage && (
                <button
                  onClick={openCreate}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold
                            hover:from-purple-700 hover:to-pink-700 transition-all
                            shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40
                            active:scale-[0.98]"
                  type="button"
                >
                  + Nova Avaliação
                </button>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Avisos úteis */}
        {isFormador && allowedTurmaIds.size === 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 rounded-xl p-4 text-sm text-amber-800 dark:text-amber-200">
            Como Formador, não consegui descobrir as tuas turmas (falta endpoint). Por segurança, não vou listar/gerir
            avaliações até existir uma rota tipo <b>GET /Turmas/formador/&#123;id&#125;</b> (ou equivalente).
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800 rounded-xl p-4 mb-6 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-red-700 dark:text-red-300 flex-1">{error}</div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-purple-600/5 dark:from-purple-500/20 dark:to-purple-600/10 opacity-50" />
            <div className="relative">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Total</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-500/20 dark:to-blue-600/10 opacity-50" />
            <div className="relative">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Com notas</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.withGrades}</div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-green-600/5 dark:from-green-500/20 dark:to-green-600/10 opacity-50" />
            <div className="relative">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{stats.avgLabel}</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.avgGrade}</div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="my-6 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />

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
                placeholder="Pesquisar por turma, aluno, módulo, nota..."
                className="w-full pl-10 pr-4 py-2.5 border rounded-lg
                           bg-gray-50 dark:bg-gray-950 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                           focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-shadow"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Turma:</span>
                <select
                  value={turmaFilter}
                  onChange={(e) => setTurmaFilter(e.target.value)}
                  className="border rounded-lg px-3 py-2
                             bg-white dark:bg-gray-900 dark:border-gray-800
                             text-gray-900 dark:text-gray-100
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                >
                  <option value="Todos">Todas</option>
                  {turmasParaSelect.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome} (ID {t.id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="px-3 py-2 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50">
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  {filtered.length} resultado{filtered.length !== 1 ? "s" : ""}
                </span>
              </div>
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

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border-b dark:border-gray-700">
                <tr>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">ID</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Turma</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Aluno</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Módulo</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Nota</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Observações</th>
                  <th className="text-left text-xs font-bold text-gray-700 dark:text-gray-200 py-4 px-6 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-16 px-6">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-500 dark:text-gray-400">A carregar avaliações...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 px-6">
                      <div className="flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
                        <svg className="w-16 h-16 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                          />
                        </svg>
                        <span>Sem avaliações para mostrar</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((a) => (
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="py-4 px-6">
                        <span className="text-sm font-mono text-gray-600 dark:text-gray-400">#{a.id}</span>
                      </td>

                      <td className="py-4 px-6">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{getTurmaNome(a.turmaId)}</span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {a.formandoNome || a.alunoNome || "Aluno"}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.moduloNome || "Módulo"}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <Gradebadge grade={a.avaliacao} />
                      </td>

                      <td className="py-4 px-6">
                        {a.observacoes ? (
                          <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{a.observacoes}</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        {canManage ? (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openEdit(a)}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium
                                         bg-amber-100 text-amber-700 hover:bg-amber-200
                                         dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50
                                         transition-colors"
                              type="button"
                            >
                              ✏ Editar
                            </button>

                            <button
                              onClick={() => deleteEvaluation(a.id, a.turmaId)}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium
                                         bg-red-100 text-red-700 hover:bg-red-200
                                         dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50
                                         transition-colors"
                              type="button"
                            >
                              🗑 Apagar
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ✅ Paginação compacta (fundo) */}
          {!loading && filtered.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-800 px-6 py-4 bg-white dark:bg-gray-900">
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
      {
        showForm && (
          <Modal title={editing ? "Editar Avaliação" : "Nova Avaliação"} onClose={closeForm} disabled={saving}>
            <form onSubmit={saveEvaluation} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Turma</label>
                  <select
                    name="turmaId"
                    value={form.turmaId}
                    onChange={onChange}
                    disabled={saving}
                    className="w-full border rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950 dark:border-gray-800
                             text-gray-900 dark:text-gray-100 disabled:opacity-60
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  >
                    <option value="">Selecionar turma...</option>
                    {turmasParaSelect.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome} (ID {t.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aluno / Inscrição</label>
                  <select
                    name="inscricaoId"
                    value={form.inscricaoId}
                    onChange={onChange}
                    disabled={saving || !form.turmaId}
                    className="w-full border rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950 dark:border-gray-800
                             text-gray-900 dark:text-gray-100 disabled:opacity-60
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  >
                    <option value="">{form.turmaId ? "Selecionar inscrição..." : "Seleciona primeiro uma turma"}</option>
                    {inscricoes.map((i) => (
                      <option key={i.id ?? i.inscricaoId} value={i.id ?? i.inscricaoId}>
                        {getInscricaoLabel(i)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Módulo da Turma</label>
                  <select
                    name="turmaModuloId"
                    value={form.turmaModuloId}
                    onChange={onChange}
                    disabled={saving || !form.turmaId}
                    className="w-full border rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950 dark:border-gray-800
                             text-gray-900 dark:text-gray-100 disabled:opacity-60
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                  >
                    <option value="">{form.turmaId ? "Selecionar módulo..." : "Seleciona primeiro uma turma"}</option>
                    {turmaModulos.map((tm) => (
                      <option key={tm.id} value={tm.id}>
                        {getTurmaModuloLabel(tm)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Avaliação (0-20)</label>
                  <input
                    name="avaliacao"
                    type="number"
                    step="0.1"
                    min="0"
                    max="20"
                    value={form.avaliacao}
                    onChange={onChange}
                    disabled={saving}
                    className="w-full border rounded-lg px-4 py-3
                             bg-white dark:bg-gray-950 dark:border-gray-800
                             text-gray-900 dark:text-gray-100 disabled:opacity-60
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    placeholder="Ex: 16"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Aceita decimais (ex: 14.5). Deixa vazio para null.
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Observações</label>
                  <textarea
                    name="observacoes"
                    value={form.observacoes}
                    onChange={onChange}
                    disabled={saving}
                    className="w-full border rounded-lg px-4 py-3 min-h-[100px]
                             bg-white dark:bg-gray-950 dark:border-gray-800
                             text-gray-900 dark:text-gray-100 disabled:opacity-60
                             focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    placeholder="Notas internas sobre a avaliação..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-800">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg border hover:bg-gray-100 transition-colors
                           dark:border-gray-700 dark:hover:bg-gray-800
                           disabled:opacity-60"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white font-medium
                           hover:from-purple-700 hover:to-pink-700 transition-all
                           shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40
                           disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      A guardar...
                    </span>
                  ) : (
                    "Guardar"
                  )}
                </button>
              </div>
            </form>
          </Modal>
        )
      }
    </div >
  );
}
