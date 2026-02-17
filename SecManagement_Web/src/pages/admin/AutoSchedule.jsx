import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getToken, getUserRoleFromToken } from "../../utils/auth";
import BurgerMenu from "../../components/BurgerMenu";

function decodeJwt(t) {
    try {
        const b = t.split(".")[1];
        return JSON.parse(atob(b.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
        return null;
    }
}

/* ---- helpers ---- */
function extractError(err, fallback) {
    const res = err?.response;
    if (!res) return err?.message || fallback;
    const data = res.data;
    if (typeof data === "string") return data;
    if (typeof data?.detail === "string" && data.detail) return data.detail;
    if (typeof data?.message === "string") return data.message;
    if (data?.errors && typeof data.errors === "object") {
        const k = Object.keys(data.errors);
        if (k.length > 0) {
            const v = data.errors[k[0]];
            if (Array.isArray(v) && v[0]) return v[0];
        }
    }
    return `${fallback}${res.status ? ` (HTTP ${res.status})` : ""}`;
}

function toYmd(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export default function AutoSchedule() {
    const navigate = useNavigate();
    const token = getToken();

    const role = useMemo(() => (token ? getUserRoleFromToken(token) : ""), [token]);
    const roleLower = String(role || "").trim().toLowerCase();
    const isFormador = roleLower === "formador";

    const payload = useMemo(() => (token ? decodeJwt(token) : null), [token]);
    const formadorId = useMemo(() => {
        if (!payload) return null;
        for (const k of ["FormadorId", "formadorId", "idFormador", "IdFormador"]) {
            const v = payload[k];
            if (v != null && Number.isFinite(Number(v))) return Number(v);
        }
        return null;
    }, [payload]);

    /* ---- state ---- */
    const [turmas, setTurmas] = useState([]);
    const [selectedTurmaId, setSelectedTurmaId] = useState("");
    const [turmaModulos, setTurmaModulos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState("");
    const [result, setResult] = useState(null);

    // Config
    const [dataInicio, setDataInicio] = useState(toYmd(new Date()));
    const [horaInicio, setHoraInicio] = useState(9);
    const [horaFim, setHoraFim] = useState(18);
    const [horaInicioAlmoco, setHoraInicioAlmoco] = useState(13);
    const [horaFimAlmoco, setHoraFimAlmoco] = useState(14);
    const [duracaoSessao, setDuracaoSessao] = useState(4);

    useEffect(() => {
        if (!token) navigate("/", { replace: true });
    }, [navigate, token]);

    /* ---- load turmas ---- */
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                let list = [];
                if (isFormador && formadorId) {
                    // Coordenador: only show turmas where formador is the coordinator
                    const all = await api.get("/Turmas");
                    const allList = Array.isArray(all.data) ? all.data : [];
                    list = allList.filter(
                        (t) => Number(t.coordenadorId) === formadorId
                    );
                } else {
                    const res = await api.get("/Turmas");
                    list = Array.isArray(res.data) ? res.data : [];
                }
                setTurmas(list);
                if (list.length > 0) setSelectedTurmaId(list[0].id);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, [isFormador, formadorId]);

    /* ---- load modulos when turma changes ---- */
    useEffect(() => {
        if (!selectedTurmaId) return;
        (async () => {
            try {
                const res = await api.get(`/Turmas/${selectedTurmaId}/modulos`);
                setTurmaModulos(Array.isArray(res.data) ? res.data : []);
            } catch {
                setTurmaModulos([]);
            }
        })();
    }, [selectedTurmaId]);

    const selectedTurma = useMemo(
        () => turmas.find((t) => String(t.id) === String(selectedTurmaId)),
        [turmas, selectedTurmaId]
    );

    /* ---- generate ---- */
    async function handleGenerate() {
        if (!selectedTurmaId) return setError("Seleciona uma turma.");
        setGenerating(true);
        setError("");
        setResult(null);

        try {
            const payload = {
                TurmaId: Number(selectedTurmaId),
                DataInicio: `${dataInicio}T00:00:00Z`,
                HoraInicioDia: horaInicio,
                HoraFimDia: horaFim,
                HoraInicioAlmoco: horaInicioAlmoco,
                HoraFimAlmoco: horaFimAlmoco,
                DuracaoSessaoHoras: duracaoSessao,
            };
            const res = await api.post("/AutoSchedule/generate", payload);
            setResult(res.data);
        } catch (err) {
            setError(extractError(err, "Erro ao gerar horário automático."));
        } finally {
            setGenerating(false);
        }
    }

    /* ---- render ---- */
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
            {/* Header */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
                <div className="container mx-auto px-6 py-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <BurgerMenu />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">
                                    ⚡ Geração Automática de Horários
                                </h1>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    Gera automaticamente o horário completo de uma turma
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-6 py-8 max-w-5xl">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* ── Turma Selection ── */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                                1. Selecionar Turma
                            </h2>

                            <select
                                value={selectedTurmaId}
                                onChange={(e) => {
                                    setSelectedTurmaId(e.target.value);
                                    setResult(null);
                                }}
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-base"
                            >
                                {turmas.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.nome} — {t.cursoNome || "Sem curso"}
                                    </option>
                                ))}
                            </select>

                            {/* Módulos da turma */}
                            {turmaModulos.length > 0 && (
                                <div className="mt-5">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                        Módulos da turma ({turmaModulos.length})
                                    </h3>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                        {turmaModulos
                                            .sort((a, b) => (a.sequencia || 0) - (b.sequencia || 0))
                                            .map((tm, idx) => (
                                                <div
                                                    key={tm.id}
                                                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 px-4 py-3"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 grid place-items-center font-black text-sm shrink-0">
                                                        {tm.sequencia || idx + 1}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">
                                                            {tm.moduloNome}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                                            {tm.formadorNome || "Sem formador"} •{" "}
                                                            <span className="font-semibold">
                                                                {tm.horas || "?"}h
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {turmaModulos.length === 0 && selectedTurmaId && (
                                <div className="mt-4 p-4 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200 text-sm">
                                    ⚠️ Esta turma não tem módulos configurados. Configura os
                                    módulos primeiro na página de Turmas.
                                </div>
                            )}
                        </div>

                        {/* ── Configuration ── */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                                2. Configuração
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                        Data de Início
                                    </label>
                                    <input
                                        type="date"
                                        value={dataInicio}
                                        onChange={(e) => setDataInicio(e.target.value)}
                                        className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                        Hora Início Dia
                                    </label>
                                    <select
                                        value={horaInicio}
                                        onChange={(e) => setHoraInicio(Number(e.target.value))}
                                        className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    >
                                        {Array.from({ length: 14 }, (_, i) => i + 7).map((h) => (
                                            <option key={h} value={h}>
                                                {String(h).padStart(2, "0")}:00
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                        Hora Fim Dia
                                    </label>
                                    <select
                                        value={horaFim}
                                        onChange={(e) => setHoraFim(Number(e.target.value))}
                                        className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    >
                                        {Array.from({ length: 14 }, (_, i) => i + 7).map((h) => (
                                            <option key={h} value={h}>
                                                {String(h).padStart(2, "0")}:00
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                        Início Almoço
                                    </label>
                                    <select
                                        value={horaInicioAlmoco}
                                        onChange={(e) =>
                                            setHoraInicioAlmoco(Number(e.target.value))
                                        }
                                        className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    >
                                        {Array.from({ length: 8 }, (_, i) => i + 11).map((h) => (
                                            <option key={h} value={h}>
                                                {String(h).padStart(2, "0")}:00
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                        Fim Almoço
                                    </label>
                                    <select
                                        value={horaFimAlmoco}
                                        onChange={(e) => setHoraFimAlmoco(Number(e.target.value))}
                                        className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    >
                                        {Array.from({ length: 8 }, (_, i) => i + 11).map((h) => (
                                            <option key={h} value={h}>
                                                {String(h).padStart(2, "0")}:00
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                                        Duração Sessão (h)
                                    </label>
                                    <select
                                        value={duracaoSessao}
                                        onChange={(e) => setDuracaoSessao(Number(e.target.value))}
                                        className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    >
                                        {[1, 2, 3, 4, 5, 6].map((h) => (
                                            <option key={h} value={h}>
                                                {h}h
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Info box */}
                            <div className="mt-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-4">
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">
                                    ℹ️ Como funciona
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                                    <p>
                                        O algoritmo percorre os módulos pela ordem de sequência
                                        definida na turma.
                                    </p>
                                    <p>
                                        Para cada módulo, aloca sessões em dias úteis
                                        (Seg-Sex), respeitando a pausa de almoço.
                                    </p>
                                    <p>
                                        Verifica automaticamente conflitos de sala e formador
                                        antes de criar cada sessão.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* ── Generate Button ── */}
                        <div className="flex flex-col items-center gap-4">
                            {error && (
                                <div className="w-full rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 p-4 text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={generating || turmaModulos.length === 0}
                                className={[
                                    "px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg",
                                    generating || turmaModulos.length === 0
                                        ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                                        : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white hover:shadow-xl hover:scale-[1.02]",
                                ].join(" ")}
                            >
                                {generating ? (
                                    <span className="flex items-center gap-3">
                                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        A gerar horário...
                                    </span>
                                ) : (
                                    "⚡ Gerar Horário Automático"
                                )}
                            </button>
                        </div>

                        {/* ── Results ── */}
                        {result && (
                            <div className="space-y-6">
                                {/* Summary */}
                                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                                        📊 Resultado
                                    </h2>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                                        <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-4 text-center">
                                            <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300">
                                                {result.totalSessoesCriadas}
                                            </div>
                                            <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                                                Sessões Criadas
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/20 p-4 text-center">
                                            <div className="text-3xl font-black text-blue-700 dark:text-blue-300">
                                                {result.totalHorasAgendadas}h
                                            </div>
                                            <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                                                Horas Agendadas
                                            </div>
                                        </div>
                                        <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50 dark:bg-purple-950/20 p-4 text-center">
                                            <div className="text-3xl font-black text-purple-700 dark:text-purple-300">
                                                {result.modulos?.length || 0}
                                            </div>
                                            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-1">
                                                Módulos
                                            </div>
                                        </div>
                                    </div>

                                    {/* Warnings */}
                                    {result.avisos?.length > 0 && (
                                        <div className="mb-6 space-y-2">
                                            {result.avisos.map((a, i) => (
                                                <div
                                                    key={i}
                                                    className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 p-3 text-sm"
                                                >
                                                    ⚠️ {a}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Per-module results */}
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
                                        Módulos
                                    </h3>
                                    <div className="space-y-2">
                                        {result.modulos?.map((m, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 px-4 py-3"
                                            >
                                                <div
                                                    className={[
                                                        "w-8 h-8 rounded-lg grid place-items-center font-black text-sm shrink-0",
                                                        m.completo
                                                            ? "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
                                                            : "bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
                                                    ].join(" ")}
                                                >
                                                    {m.completo ? "✓" : "!"}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold text-gray-900 dark:text-gray-100 truncate text-sm">
                                                        {m.moduloNome}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {m.formadorNome} •{" "}
                                                        {m.horasAgendadas?.toFixed(1) || 0}h /{" "}
                                                        {m.horasTotais}h
                                                    </div>
                                                </div>
                                                <div
                                                    className={[
                                                        "text-xs font-bold px-3 py-1 rounded-full",
                                                        m.completo
                                                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                                            : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                                                    ].join(" ")}
                                                >
                                                    {m.completo ? "Completo" : "Parcial"}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Sessions list */}
                                {result.sessoesCriadas?.length > 0 && (
                                    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                                            📅 Sessões Criadas ({result.sessoesCriadas.length})
                                        </h3>

                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="border-b border-gray-200 dark:border-gray-800">
                                                        <th className="text-left py-2 px-3 text-xs font-bold text-gray-600 dark:text-gray-400">
                                                            Módulo
                                                        </th>
                                                        <th className="text-left py-2 px-3 text-xs font-bold text-gray-600 dark:text-gray-400">
                                                            Formador
                                                        </th>
                                                        <th className="text-left py-2 px-3 text-xs font-bold text-gray-600 dark:text-gray-400">
                                                            Sala
                                                        </th>
                                                        <th className="text-left py-2 px-3 text-xs font-bold text-gray-600 dark:text-gray-400">
                                                            Data
                                                        </th>
                                                        <th className="text-left py-2 px-3 text-xs font-bold text-gray-600 dark:text-gray-400">
                                                            Horário
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {result.sessoesCriadas.map((s, idx) => {
                                                        const ini = new Date(s.horarioInicio);
                                                        const fim = new Date(s.horarioFim);
                                                        return (
                                                            <tr
                                                                key={idx}
                                                                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition"
                                                            >
                                                                <td className="py-2 px-3 font-semibold text-gray-900 dark:text-gray-100">
                                                                    {s.moduloNome}
                                                                </td>
                                                                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                                                                    {s.formadorNome}
                                                                </td>
                                                                <td className="py-2 px-3 text-gray-700 dark:text-gray-300">
                                                                    {s.salaNome}
                                                                </td>
                                                                <td className="py-2 px-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                                    {ini.toLocaleDateString("pt-PT")}
                                                                </td>
                                                                <td className="py-2 px-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                                    {ini.toLocaleTimeString("pt-PT", {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    })}{" "}
                                                                    –{" "}
                                                                    {fim.toLocaleTimeString("pt-PT", {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    })}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* CTA */}
                                <div className="flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/admin/sessions")}
                                        className="px-6 py-3 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-700 text-white transition shadow"
                                    >
                                        Ver no Calendário de Sessões →
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
