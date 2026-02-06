// src/pages/admin/Recruit.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getToken, getUserRoleFromToken, decodeJwt } from "../../utils/auth";

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

function toLocalDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function getFormandoIdFromStorageOrToken() {
  const ls = localStorage.getItem("formandoId");
  if (ls && Number.isFinite(Number(ls))) return Number(ls);

  const token = getToken();
  const payload = decodeJwt(token);
  if (!payload) return null;

  const candidates = ["formandoId", "FormandoId", "idFormando", "IdFormando", "formando_id"];
  for (const k of candidates) {
    const v = payload[k];
    if (v != null && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

const estadoColors = {
  Ativo: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Candidatura: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Rejeitado: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function EstadoBadge({ estado }) {
  const e = estado || "N/A";
  const cls = estadoColors[e] || "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300";
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>{e}</span>;
}

function normalizeNif(nif) {
  return String(nif ?? "").trim().replace(/\s+/g, "");
}
function normalizeTelefone(tel) {
  return String(tel ?? "").trim().replace(/\s+/g, "");
}

function isEmpty(v) {
  return String(v ?? "").trim().length === 0;
}

// ✅ Obrigatórios: regras simples e práticas
function validateTelefoneRequired(tel) {
  const v = normalizeTelefone(tel);
  if (!v) return "Telefone é obrigatório.";
  // permite +351... ou números simples 9-15 dígitos (sem espaços)
  const ok = /^[+\d][\d]{8,14}$/.test(v.replace(/^\+/, "+"));
  return ok ? null : "Telefone inválido (ex: +351912345678).";
}

function validateNifRequired(nif) {
  const v = normalizeNif(nif);
  if (!v) return "NIF é obrigatório.";
  const ok = /^\d{9}$/.test(v);
  return ok ? null : "NIF inválido (tem de ter 9 dígitos).";
}

function validateMoradaRequired(morada) {
  const v = String(morada ?? "").trim();
  if (!v) return "Morada é obrigatória.";
  if (v.length < 8) return "Morada demasiado curta.";
  return null;
}

function validateCCRequired(cc) {
  const v = String(cc ?? "").trim();
  if (!v) return "CC é obrigatório.";
  if (v.length < 6) return "CC demasiado curto.";
  return null;
}

export default function Recruit() {
  const navigate = useNavigate();

  const token = getToken();
  const roleRaw = useMemo(() => getUserRoleFromToken(token) || "", [token]);
  const roleLower = String(roleRaw).trim().toLowerCase();

  const isUser = roleLower === "user";
  const isFormando = roleLower === "formando" || isUser;
  const isStaff =
    roleLower === "admin" || roleLower === "formador" || roleLower === "secretaria" || roleLower === "superadmin";

  const [tab, setTab] = useState(isStaff ? "pendentes" : "cursos");

  const [turmas, setTurmas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loadingBase, setLoadingBase] = useState(true);
  const [error, setError] = useState("");

  // Cursos (Formando/User)
  const [searchCursos, setSearchCursos] = useState("");
  const [submittingCursoId, setSubmittingCursoId] = useState(null);

  // ✅ Agora obrigatórios
  const [candidaturaExtra, setCandidaturaExtra] = useState({
    telefone: "",
    nif: "",
    morada: "",
    cc: "",
  });

  const [extraErrors, setExtraErrors] = useState({
    telefone: "Telefone é obrigatório.",
    nif: "NIF é obrigatório.",
    morada: "Morada é obrigatória.",
    cc: "CC é obrigatório.",
  });

  // Minhas inscrições (Formando/User)
  const [minhas, setMinhas] = useState([]);
  const [loadingMinhas, setLoadingMinhas] = useState(false);
  const [busyInscricaoId, setBusyInscricaoId] = useState(null);

  // Staff - Pendentes
  const [pendentes, setPendentes] = useState([]);
  const [loadingPendentes, setLoadingPendentes] = useState(false);
  const [searchPendentes, setSearchPendentes] = useState("");
  const [filtrarCursoId, setFiltrarCursoId] = useState("");
  const [selectedPendentes, setSelectedPendentes] = useState(new Set());
  const [turmaAprovacao, setTurmaAprovacao] = useState("");
  const [approvingBatch, setApprovingBatch] = useState(false);

  async function loadBase() {
    setLoadingBase(true);
    setError("");
    try {
      const [tRes, cRes] = await Promise.all([api.get("/Turmas"), api.get("/Cursos")]);
      setTurmas(Array.isArray(tRes.data) ? tRes.data : []);
      setCursos(Array.isArray(cRes.data) ? cRes.data : []);
    } catch (err) {
      setError(extractError(err, "Erro ao carregar dados base."));
    } finally {
      setLoadingBase(false);
    }
  }

  async function loadMinhasInscricoes() {
    const formandoId = getFormandoIdFromStorageOrToken();
    if (!formandoId) {
      setError("Não encontrei o FormandoId no token/localStorage.");
      return;
    }

    setLoadingMinhas(true);
    setError("");
    try {
      const res = await api.get(`/Inscricoes/aluno/${formandoId}`);
      setMinhas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(extractError(err, "Erro ao carregar as tuas inscrições."));
    } finally {
      setLoadingMinhas(false);
    }
  }

  async function loadPendentes() {
    setLoadingPendentes(true);
    setError("");
    try {
      const endpoint = filtrarCursoId ? `/Inscricoes/pendentes/curso/${filtrarCursoId}` : "/Inscricoes/pendentes";
      const res = await api.get(endpoint);
      setPendentes(Array.isArray(res.data) ? res.data : []);
      setSelectedPendentes(new Set());
    } catch (err) {
      setError(extractError(err, "Erro ao carregar candidaturas pendentes."));
    } finally {
      setLoadingPendentes(false);
    }
  }

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFormando) loadMinhasInscricoes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleLower]);

  useEffect(() => {
    if (isStaff && tab === "pendentes") loadPendentes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff, tab, filtrarCursoId]);

  const cursosFiltrados = useMemo(() => {
    const s = searchCursos.trim().toLowerCase();
    if (!s) return cursos;
    return cursos.filter((c) => {
      const nome = String(c?.nome ?? "").toLowerCase();
      const nivel = String(c?.nivelCurso ?? "").toLowerCase();
      const area = String(c?.areaNome ?? "").toLowerCase();
      const id = String(c?.id ?? "");
      return nome.includes(s) || nivel.includes(s) || area.includes(s) || id.includes(s);
    });
  }, [cursos, searchCursos]);

  const pendentesFiltrados = useMemo(() => {
    const s = searchPendentes.trim().toLowerCase();
    if (!s) return pendentes;
    return pendentes.filter((i) => {
      const nome = String(i?.formandoNome ?? "").toLowerCase();
      const curso = String(i?.cursoNome ?? "").toLowerCase();
      const id = String(i?.id ?? "");
      return nome.includes(s) || curso.includes(s) || id.includes(s);
    });
  }, [pendentes, searchPendentes]);

  function recomputeExtraErrors(nextState) {
    return {
      telefone: validateTelefoneRequired(nextState.telefone),
      nif: validateNifRequired(nextState.nif),
      morada: validateMoradaRequired(nextState.morada),
      cc: validateCCRequired(nextState.cc),
    };
  }

  function onChangeExtra(e) {
    const { name, value } = e.target;

    setCandidaturaExtra((prev) => {
      const next = { ...prev, [name]: value };
      setExtraErrors(recomputeExtraErrors(next));
      return next;
    });
  }

  const canSubmitCandidatura = useMemo(() => {
    // obrigatório -> só pode se não houver erros
    return !extraErrors.telefone && !extraErrors.nif && !extraErrors.morada && !extraErrors.cc;
  }, [extraErrors]);

  async function candidatarAoCurso(cursoId) {
    const formandoId = getFormandoIdFromStorageOrToken();
    if (!formandoId) {
      setError("Não encontrei o FormandoId no token/localStorage.");
      return;
    }

    // ✅ valida antes (bloqueia mesmo)
    const errs = recomputeExtraErrors(candidaturaExtra);
    setExtraErrors(errs);

    if (errs.telefone || errs.nif || errs.morada || errs.cc) {
      setError("Preenche corretamente os dados obrigatórios antes de submeter.");
      return;
    }

    setSubmittingCursoId(cursoId);
    setError("");

    try {
      await api.post("/Inscricoes/candidatar", {
        CursoId: Number(cursoId),
        FormandoId: Number(formandoId),
        Telefone: normalizeTelefone(candidaturaExtra.telefone),
        NIF: normalizeNif(candidaturaExtra.nif),
        Morada: String(candidaturaExtra.morada).trim(),
        CC: String(candidaturaExtra.cc).trim(),
      });

      await loadMinhasInscricoes();
      setTab("minhas");
    } catch (err) {
      setError(extractError(err, "Erro ao submeter candidatura."));
    } finally {
      setSubmittingCursoId(null);
    }
  }

  async function cancelarInscricao(inscricaoId) {
    if (!window.confirm("Tens a certeza que queres cancelar esta candidatura/inscrição?")) return;

    setBusyInscricaoId(inscricaoId);
    setError("");
    try {
      await api.delete(`/Inscricoes/${inscricaoId}`);
      setMinhas((prev) => prev.filter((x) => Number(x?.id) !== Number(inscricaoId)));
    } catch (err) {
      setError(extractError(err, "Erro ao cancelar inscrição."));
    } finally {
      setBusyInscricaoId(null);
    }
  }

  function togglePendente(id) {
    setSelectedPendentes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllPendentes() {
    if (selectedPendentes.size === pendentesFiltrados.length) setSelectedPendentes(new Set());
    else setSelectedPendentes(new Set(pendentesFiltrados.map((p) => p.id)));
  }

  async function aprovarLote() {
    if (selectedPendentes.size === 0) return alert("Seleciona pelo menos uma candidatura.");

    const turmaId = Number(turmaAprovacao);
    if (!Number.isFinite(turmaId) || turmaId <= 0) return alert("Seleciona uma turma válida.");

    if (!window.confirm(`Aprovar ${selectedPendentes.size} candidatura(s) para a turma selecionada?`)) return;

    setApprovingBatch(true);
    setError("");
    try {
      await api.post("/Inscricoes/aprovar-lote", {
        TurmaId: turmaId,
        InscricaoIds: Array.from(selectedPendentes),
      });
      await loadPendentes();
      setTurmaAprovacao("");
      alert("Candidaturas aprovadas com sucesso.");
    } catch (err) {
      setError(extractError(err, "Erro ao aprovar candidaturas em lote."));
    } finally {
      setApprovingBatch(false);
    }
  }

  async function rejeitarCandidatura(inscricaoId) {
    if (!window.confirm("Tens a certeza que queres rejeitar esta candidatura?")) return;
    setError("");
    try {
      await api.put(`/Inscricoes/${inscricaoId}/rejeitar`);
      await loadPendentes();
      alert("Candidatura rejeitada.");
    } catch (err) {
      setError(extractError(err, "Erro ao rejeitar candidatura."));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">Inscrições</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isStaff ? "Gere candidaturas pendentes" : "Candidata-te a cursos e acompanha o estado"}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                           hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium"
              >
                ← Voltar
              </button>

              {isStaff ? (
                <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
                  <button
                    onClick={() => setTab("pendentes")}
                    className={`px-4 py-2.5 text-sm font-medium transition-all ${
                      tab === "pendentes"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    Candidaturas
                    {pendentes.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs">
                        {pendentes.length}
                      </span>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
                  <button
                    onClick={() => setTab("cursos")}
                    className={`px-4 py-2.5 text-sm font-medium transition-all ${
                      tab === "cursos"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    Cursos
                  </button>
                  <button
                    onClick={() => setTab("minhas")}
                    className={`px-4 py-2.5 text-sm font-medium transition-all ${
                      tab === "minhas"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    As minhas
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 
                          px-5 py-4 rounded-xl mb-6 text-sm shadow-sm">
            {error}
          </div>
        )}

        {/* STAFF: pendentes */}
        {isStaff && tab === "pendentes" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5">
                <div className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Filtros</div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Filtrar por Curso
                    </label>
                    <select
                      value={filtrarCursoId}
                      onChange={(e) => setFiltrarCursoId(e.target.value)}
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                                 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loadingBase}
                    >
                      <option value="">Todos</option>
                      {cursos.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pesquisar</label>
                    <input
                      value={searchPendentes}
                      onChange={(e) => setSearchPendentes(e.target.value)}
                      placeholder="Nome, curso ou ID..."
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                                 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <button
                    onClick={loadPendentes}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 
                               hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium"
                    disabled={loadingPendentes}
                  >
                    Recarregar
                  </button>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5">
                <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Aprovar em Lote</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Seleciona candidaturas e atribui a uma turma.
                </p>

                <div className="space-y-4">
                  <select
                    value={turmaAprovacao}
                    onChange={(e) => setTurmaAprovacao(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={approvingBatch || loadingBase}
                  >
                    <option value="">Seleciona a turma...</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome} {t.cursoNome ? `— ${t.cursoNome}` : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={aprovarLote}
                    className="w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 text-white 
                               hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 font-medium"
                    disabled={approvingBatch || selectedPendentes.size === 0 || !turmaAprovacao}
                  >
                    {approvingBatch ? "A aprovar..." : `Aprovar ${selectedPendentes.size} candidatura(s)`}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-auto">
                <table className="min-w-full">
                  <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="py-4 px-6">
                        <input
                          type="checkbox"
                          checked={pendentesFiltrados.length > 0 && selectedPendentes.size === pendentesFiltrados.length}
                          onChange={toggleAllPendentes}
                          className="w-4 h-4 rounded"
                        />
                      </th>
                      <th className="text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300 py-4 px-6">ID</th>
                      <th className="text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300 py-4 px-6">Formando</th>
                      <th className="text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300 py-4 px-6">Curso</th>
                      <th className="text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300 py-4 px-6">Data</th>
                      <th className="text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300 py-4 px-6">Ações</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {loadingPendentes ? (
                      <tr>
                        <td colSpan="6" className="py-16 px-6 text-center text-gray-500 dark:text-gray-400">
                          A carregar...
                        </td>
                      </tr>
                    ) : pendentesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-16 px-6 text-center text-gray-500 dark:text-gray-400">
                          Sem candidaturas pendentes.
                        </td>
                      </tr>
                    ) : (
                      pendentesFiltrados.map((p) => (
                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                          <td className="py-4 px-6">
                            <input
                              type="checkbox"
                              checked={selectedPendentes.has(p.id)}
                              onChange={() => togglePendente(p.id)}
                              className="w-4 h-4 rounded"
                            />
                          </td>
                          <td className="py-4 px-6 text-sm font-mono text-gray-600 dark:text-gray-400">#{p.id}</td>
                          <td className="py-4 px-6 text-sm font-semibold text-gray-900 dark:text-gray-100">
                            {p.formandoNome || `#${p.formandoId}`}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">{p.cursoNome || `#${p.cursoId}`}</td>
                          <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">{toLocalDateTime(p.dataInscricao)}</td>
                          <td className="py-4 px-6">
                            <button
                              onClick={() => rejeitarCandidatura(p.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100"
                            >
                              Rejeitar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* FORMANDO/USER */}
        {!isStaff && isFormando && (
          <>
            {tab === "cursos" && (
              <>
                {/* Obrigatórios */}
                <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
                  <div className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Dados obrigatórios</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Tens de preencher estes dados antes de te candidatares.
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Telefone *</label>
                      <input
                        name="telefone"
                        value={candidaturaExtra.telefone}
                        onChange={onChangeExtra}
                        placeholder="Ex: +351912345678"
                        className="w-full border rounded-lg px-4 py-2.5 bg-white dark:bg-gray-900 dark:border-gray-700"
                      />
                      {extraErrors.telefone && <div className="mt-1 text-xs text-red-600">{extraErrors.telefone}</div>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">NIF *</label>
                      <input
                        name="nif"
                        value={candidaturaExtra.nif}
                        onChange={onChangeExtra}
                        placeholder="9 dígitos"
                        className="w-full border rounded-lg px-4 py-2.5 bg-white dark:bg-gray-900 dark:border-gray-700"
                      />
                      {extraErrors.nif && <div className="mt-1 text-xs text-red-600">{extraErrors.nif}</div>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Morada *</label>
                      <input
                        name="morada"
                        value={candidaturaExtra.morada}
                        onChange={onChangeExtra}
                        placeholder="Ex: Rua ... Nº ... , Localidade"
                        className="w-full border rounded-lg px-4 py-2.5 bg-white dark:bg-gray-900 dark:border-gray-700"
                      />
                      {extraErrors.morada && <div className="mt-1 text-xs text-red-600">{extraErrors.morada}</div>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cartão de Cidadão *</label>
                      <input
                        name="cc"
                        value={candidaturaExtra.cc}
                        onChange={onChangeExtra}
                        placeholder="Número do CC"
                        className="w-full border rounded-lg px-4 py-2.5 bg-white dark:bg-gray-900 dark:border-gray-700"
                      />
                      {extraErrors.cc && <div className="mt-1 text-xs text-red-600">{extraErrors.cc}</div>}
                    </div>

                    {!canSubmitCandidatura && (
                      <div className="md:col-span-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                        Preenche corretamente os campos obrigatórios para poderes candidatar-te.
                      </div>
                    )}
                  </div>
                </div>

                {/* Pesquisa */}
                <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
                    <input
                      value={searchCursos}
                      onChange={(e) => setSearchCursos(e.target.value)}
                      placeholder="Pesquisar cursos..."
                      className="w-full border rounded-lg px-4 py-2.5 bg-white dark:bg-gray-900 dark:border-gray-700"
                    />
                    <button
                      onClick={loadBase}
                      className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700"
                      disabled={loadingBase}
                    >
                      Recarregar
                    </button>
                  </div>
                </div>

                {/* Lista cursos */}
                <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300 py-4 px-6">Curso</th>
                          <th className="text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300 py-4 px-6">Área / Nível</th>
                          <th className="text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300 py-4 px-6">Ação</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {loadingBase ? (
                          <tr>
                            <td colSpan="3" className="py-16 px-6 text-center text-gray-500 dark:text-gray-400">
                              A carregar...
                            </td>
                          </tr>
                        ) : cursosFiltrados.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="py-16 px-6 text-center text-gray-500 dark:text-gray-400">
                              Nenhum curso encontrado.
                            </td>
                          </tr>
                        ) : (
                          cursosFiltrados.map((c) => (
                            <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                              <td className="py-4 px-6 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {c.nome} <span className="text-gray-400 font-normal">#{c.id}</span>
                              </td>
                              <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                                {c.areaNome ? c.areaNome : "—"} {c.nivelCurso ? `— ${c.nivelCurso}` : ""}
                              </td>
                              <td className="py-4 px-6">
                                <button
                                  onClick={() => candidatarAoCurso(c.id)}
                                  disabled={submittingCursoId === c.id || !canSubmitCandidatura}
                                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                                >
                                  {submittingCursoId === c.id ? "A submeter..." : "Candidatar-me"}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {tab === "minhas" && (
              <>
                <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">As tuas candidaturas/inscrições.</div>
                    <button
                      onClick={loadMinhasInscricoes}
                      className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700"
                      disabled={loadingMinhas}
                    >
                      Recarregar
                    </button>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300 py-4 px-6">Curso</th>
                          <th className="text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300 py-4 px-6">Turma</th>
                          <th className="text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300 py-4 px-6">Data</th>
                          <th className="text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300 py-4 px-6">Estado</th>
                          <th className="text-left text-xs font-bold uppercase text-gray-700 dark:text-gray-300 py-4 px-6">Ação</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {loadingMinhas ? (
                          <tr>
                            <td colSpan="5" className="py-16 px-6 text-center text-gray-500 dark:text-gray-400">
                              A carregar...
                            </td>
                          </tr>
                        ) : minhas.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="py-16 px-6 text-center text-gray-500 dark:text-gray-400">
                              Ainda não tens candidaturas.
                            </td>
                          </tr>
                        ) : (
                          minhas.map((i) => (
                            <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                              <td className="py-4 px-6 text-sm font-semibold text-gray-900 dark:text-gray-100">{i.cursoNome || `#${i.cursoId}`}</td>
                              <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                                {i.turmaNome || (i.turmaId ? `#${i.turmaId}` : "A aguardar colocação")}
                              </td>
                              <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">{toLocalDateTime(i.dataInscricao)}</td>
                              <td className="py-4 px-6">
                                <EstadoBadge estado={i.estado} />
                              </td>
                              <td className="py-4 px-6">
                                <button
                                  onClick={() => cancelarInscricao(i.id)}
                                  disabled={busyInscricaoId === i.id}
                                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                >
                                  {busyInscricaoId === i.id ? "A cancelar..." : "Cancelar"}
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
