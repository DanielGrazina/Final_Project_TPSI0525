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
  Pendente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  Desistiu: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  Concluido: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  Concluído: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
};

function EstadoBadge({ estado }) {
  const e = estado || "N/A";
  const cls = estadoColors[e] || "bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300";
  return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>{e}</span>;
}

function isNullishTurma(i) {
  return i?.turmaId == null;
}

export default function Recruit() {
  const navigate = useNavigate();

  const token = getToken();
  const roleRaw = useMemo(() => getUserRoleFromToken(token) || "", [token]);
  const roleLower = String(roleRaw).trim().toLowerCase();

  // ✅ User pode candidatar-se -> usa a vista de "Formando"
  const isUser = roleLower === "user";
  const isFormando = roleLower === "formando" || isUser;
  const isStaff = roleLower === "admin" || roleLower === "formador";
  const roleOk = !!roleLower;

  // Tabs
  const [tab, setTab] = useState(isStaff ? "staff" : "cursos"); // "cursos" | "minhas" | "staff"

  // Dados gerais
  const [turmas, setTurmas] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loadingBase, setLoadingBase] = useState(true);

  const [error, setError] = useState("");

  // Cursos (Formando/User)
  const [searchCursos, setSearchCursos] = useState("");
  const [submittingCursoId, setSubmittingCursoId] = useState(null);

  // Minhas inscrições (Formando/User)
  const [minhas, setMinhas] = useState([]);
  const [loadingMinhas, setLoadingMinhas] = useState(false);
  const [busyInscricaoId, setBusyInscricaoId] = useState(null);

  // Staff: inscritos por turma
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [inscritos, setInscritos] = useState([]);
  const [loadingInscritos, setLoadingInscritos] = useState(false);
  const [searchInscritos, setSearchInscritos] = useState("");

  // Staff: candidaturas sem turma (usamos tudo o que vier de "aluno" se tiveres um endpoint global não enviado)
  // Como não enviaste GET /Inscricoes (listar todas), vamos reaproveitar:
  // -> mostra "candidaturas sem turma" apenas a partir da turma selecionada? (não serve)
  // Então: nesta versão, o staff gere apenas por TURMA e a colocação em turma é feita a partir de uma inscrição que o staff já tem na lista de "candidatos".
  // Para ter lista global de candidaturas, precisas de um endpoint tipo GET /Inscricoes (Admin).
  // Mesmo assim, eu já implemento UI para "colocar em turma" quando tens uma inscrição em mãos (ex: via pesquisa).
  const [colocarInscricaoId, setColocarInscricaoId] = useState("");
  const [colocarTurmaId, setColocarTurmaId] = useState("");
  const [placing, setPlacing] = useState(false);

  async function loadBase() {
    setLoadingBase(true);
    setError("");

    try {
      const [tRes, cRes] = await Promise.all([api.get("/Turmas"), api.get("/Cursos")]);
      const tList = Array.isArray(tRes.data) ? tRes.data : [];
      const cList = Array.isArray(cRes.data) ? cRes.data : [];

      setTurmas(tList);
      setCursos(cList);

      if (isStaff && !selectedTurmaId && tList.length) {
        setSelectedTurmaId(String(tList[0]?.id ?? ""));
      }
    } catch (err) {
      setError(extractError(err, "Erro ao carregar dados base."));
    } finally {
      setLoadingBase(false);
    }
  }

  async function loadMinhasInscricoes() {
    const formandoId = getFormandoIdFromStorageOrToken();

    if (!formandoId) {
      setError(
        "Não encontrei o FormandoId. O backend tem de expor o FormandoId no token (claim) ou guardá-lo no localStorage no login."
      );
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

  async function loadInscritosPorTurma(turmaId) {
    if (!turmaId) return;

    setLoadingInscritos(true);
    setError("");

    try {
      const res = await api.get(`/Inscricoes/turma/${turmaId}`);
      setInscritos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(extractError(err, "Erro ao carregar inscritos da turma."));
    } finally {
      setLoadingInscritos(false);
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
    if (!roleOk) return;

    if (isFormando) {
      loadMinhasInscricoes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleOk, roleLower]);

  useEffect(() => {
    if (isStaff && selectedTurmaId) {
      loadInscritosPorTurma(selectedTurmaId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTurmaId, roleLower]);

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

  const inscritosFiltrados = useMemo(() => {
    const s = searchInscritos.trim().toLowerCase();
    if (!s) return inscritos;

    return inscritos.filter((i) => {
      const nome = String(i?.formandoNome ?? "").toLowerCase();
      const estado = String(i?.estado ?? "").toLowerCase();
      return nome.includes(s) || estado.includes(s);
    });
  }, [inscritos, searchInscritos]);

  async function candidatarAoCurso(cursoId) {
    const formandoId = getFormandoIdFromStorageOrToken();

    if (!formandoId) {
      setError(
        "Não encontrei o FormandoId. O backend tem de expor o FormandoId no token (claim) ou guardá-lo no localStorage no login."
      );
      return;
    }

    setSubmittingCursoId(cursoId);
    setError("");

    try {
      await api.post("/Inscricoes/candidatar", {
        CursoId: Number(cursoId),
        FormandoId: Number(formandoId),
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

  async function colocarEmTurma() {
    const inscricaoId = Number(colocarInscricaoId);
    const turmaId = Number(colocarTurmaId);

    if (!Number.isFinite(inscricaoId) || inscricaoId <= 0) return alert("Inscrição inválida.");
    if (!Number.isFinite(turmaId) || turmaId <= 0) return alert("Turma inválida.");

    setPlacing(true);
    setError("");

    try {
      await api.put(`/Inscricoes/${inscricaoId}/colocar-turma`, { TurmaId: turmaId });

      // refresh lista da turma selecionada se coincidir
      if (String(turmaId) === String(selectedTurmaId)) {
        await loadInscritosPorTurma(selectedTurmaId);
      }
      // refresh base e limpar form
      await loadBase();

      setColocarInscricaoId("");
      setColocarTurmaId("");
      alert("Aluno colocado na turma com sucesso.");
    } catch (err) {
      setError(extractError(err, "Erro ao colocar aluno na turma."));
    } finally {
      setPlacing(false);
    }
  }

  const showNoRole = !roleOk;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">
                Inscrições
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isStaff ? "Consulta inscritos por turma e coloca candidaturas em turmas" : "Candidata-te a cursos e acompanha o estado"}
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

              {/* Tabs */}
              {isStaff ? (
                <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
                  <button
                    onClick={() => setTab("staff")}
                    className={`px-4 py-2.5 text-sm font-medium transition-all ${
                      tab === "staff"
                        ? "bg-blue-600 text-white"
                        : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                  >
                    Gestão
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

        {showNoRole && (
          <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-sm text-gray-700 dark:text-gray-300">
            Não foi possível determinar a role a partir do token. Verifica as claims do JWT.
          </div>
        )}

        {/* STAFF */}
        {isStaff && tab === "staff" && (
          <>
            {/* Top controls */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Inscritos por turma */}
              <div className="lg:col-span-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Turma:</span>
                    <select
                      value={selectedTurmaId}
                      onChange={(e) => setSelectedTurmaId(e.target.value)}
                      className="border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                                 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loadingBase}
                    >
                      {turmas.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nome} {t.cursoNome ? `— ${t.cursoNome}` : ""}
                        </option>
                      ))}
                    </select>

                    <button
                      onClick={() => loadInscritosPorTurma(selectedTurmaId)}
                      className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 
                                 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium text-sm"
                      disabled={!selectedTurmaId || loadingInscritos}
                    >
                      Recarregar
                    </button>
                  </div>

                  <input
                    value={searchInscritos}
                    onChange={(e) => setSearchInscritos(e.target.value)}
                    placeholder="Pesquisar por nome ou estado..."
                    className="w-full lg:w-80 border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Colocar em turma (manual) */}
              <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5">
                <div className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Colocar em turma</div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Usa o ID da inscrição (candidatura) e escolhe a turma. O backend valida se o curso bate certo.
                </p>

                <div className="grid grid-cols-1 gap-3">
                  <input
                    value={colocarInscricaoId}
                    onChange={(e) => setColocarInscricaoId(e.target.value)}
                    placeholder="InscriçãoId (ex: 12)"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={placing}
                  />

                  <select
                    value={colocarTurmaId}
                    onChange={(e) => setColocarTurmaId(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={placing || loadingBase}
                  >
                    <option value="">Seleciona a turma...</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome} {t.cursoNome ? `— ${t.cursoNome}` : ""}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={colocarEmTurma}
                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white 
                               hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all duration-200 font-medium
                               shadow-lg shadow-blue-500/30"
                    disabled={placing}
                  >
                    {placing ? "A colocar..." : "Colocar"}
                  </button>
                </div>
              </div>
            </div>

            {/* Table inscritos */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-auto">
                <table className="min-w-full">
                  <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                        Inscrição
                      </th>
                      <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                        Formando
                      </th>
                      <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                        Data
                      </th>
                      <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                        Estado
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {loadingBase || loadingInscritos ? (
                      <tr>
                        <td colSpan="4" className="py-16 px-6 text-center">
                          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <p className="mt-3 text-gray-500 dark:text-gray-400">A carregar...</p>
                        </td>
                      </tr>
                    ) : inscritosFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="py-16 px-6 text-center text-gray-500 dark:text-gray-400">
                          Nenhum inscrito encontrado.
                        </td>
                      </tr>
                    ) : (
                      inscritosFiltrados.map((i) => (
                        <tr key={i.id} className="hover:bg-blue-50/50 dark:hover:bg-gray-800/60 transition-colors duration-150">
                          <td className="py-4 px-6 text-sm text-gray-600 dark:text-gray-400 font-mono">#{i.id}</td>
                          <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100 font-semibold">
                            {i.formandoNome || `#${i.formandoId}`}
                          </td>
                          <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                            {toLocalDateTime(i.dataInscricao)}
                          </td>
                          <td className="py-4 px-6">
                            <EstadoBadge estado={i.estado} />
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

        {/* FORMING/USER */}
        {!isStaff && isFormando && (
          <>
            {/* TAB: CURSOS */}
            {tab === "cursos" && (
              <>
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
                    <input
                      value={searchCursos}
                      onChange={(e) => setSearchCursos(e.target.value)}
                      placeholder="Pesquisar cursos por nome, nível, área ou ID..."
                      className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-2.5
                                 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                                 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />

                    <button
                      onClick={loadBase}
                      className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 
                                 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium text-sm"
                      disabled={loadingBase}
                    >
                      Recarregar
                    </button>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-auto">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                            Curso
                          </th>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                            Área / Nível
                          </th>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                            Ação
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {loadingBase ? (
                          <tr>
                            <td colSpan="3" className="py-16 px-6 text-center">
                              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <p className="mt-3 text-gray-500 dark:text-gray-400">A carregar cursos...</p>
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
                            <tr key={c.id} className="hover:bg-blue-50/50 dark:hover:bg-gray-800/60 transition-colors duration-150">
                              <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100 font-semibold">
                                {c.nome} <span className="text-gray-400 font-normal">#{c.id}</span>
                              </td>
                              <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                                {c.areaNome ? c.areaNome : "—"} {c.nivelCurso ? `— ${c.nivelCurso}` : ""}
                              </td>
                              <td className="py-4 px-6">
                                <button
                                  onClick={() => candidatarAoCurso(c.id)}
                                  disabled={submittingCursoId === c.id}
                                  className="px-4 py-2 rounded-lg text-sm font-medium text-blue-700 dark:text-blue-400 
                                             bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 
                                             disabled:opacity-50 transition-all duration-200"
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

            {/* TAB: MINHAS */}
            {tab === "minhas" && (
              <>
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      As tuas candidaturas/inscrições (curso + eventual turma).
                    </div>

                    <button
                      onClick={loadMinhasInscricoes}
                      className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 
                                 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium text-sm"
                      disabled={loadingMinhas}
                    >
                      Recarregar
                    </button>
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
                  <div className="overflow-auto">
                    <table className="min-w-full">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                            Curso
                          </th>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                            Turma
                          </th>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                            Data
                          </th>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                            Estado
                          </th>
                          <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                            Ação
                          </th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                        {loadingMinhas ? (
                          <tr>
                            <td colSpan="5" className="py-16 px-6 text-center">
                              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <p className="mt-3 text-gray-500 dark:text-gray-400">A carregar...</p>
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
                            <tr key={i.id} className="hover:bg-blue-50/50 dark:hover:bg-gray-800/60 transition-colors duration-150">
                              <td className="py-4 px-6 text-sm text-gray-900 dark:text-gray-100 font-semibold">
                                {i.cursoNome || `#${i.cursoId}`}
                              </td>
                              <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                                {i.turmaNome || (i.turmaId ? `#${i.turmaId}` : "A aguardar colocação")}
                              </td>
                              <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-300">
                                {toLocalDateTime(i.dataInscricao)}
                              </td>
                              <td className="py-4 px-6">
                                <EstadoBadge estado={i.estado} />
                              </td>
                              <td className="py-4 px-6">
                                <button
                                  onClick={() => cancelarInscricao(i.id)}
                                  disabled={busyInscricaoId === i.id}
                                  className="px-4 py-2 rounded-lg text-sm font-medium text-red-700 dark:text-red-400 
                                             bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 
                                             disabled:opacity-50 transition-all duration-200"
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

                {/* Ajuda visual para "aguardar colocação" */}
                {minhas.some(isNullishTurma) && (
                  <div className="mt-5 text-sm text-gray-600 dark:text-gray-400">
                    Nota: quando a secretaria te colocar numa turma, a tua candidatura passa para <b>Ativo</b> e aparece aqui a turma atribuída.
                  </div>
                )}
              </>
            )}
          </>
        )}

        {!isStaff && !isFormando && (
          <div className="bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 rounded-xl p-6 text-sm text-gray-700 dark:text-gray-300">
            A tua role atual não tem uma vista configurada para Inscrições.
          </div>
        )}
      </div>
    </div>
  );
}
