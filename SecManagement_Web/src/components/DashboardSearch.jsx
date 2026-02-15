import { useState, useEffect, useMemo } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
}

export default function DashboardSearch({ perms }) {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("cursos"); // "cursos" | "turmas" | "salas" | "formandos"
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 500);

    // Estado para "Salas -> Ver Ocupação"
    const [showOccupancy, setShowOccupancy] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Permissão para ver a tab de Formandos
    const canSearchFormandos = perms.isAdmin || perms.isSuperAdmin || perms.isSecretaria;

    // Se o utilizador não tiver permissão e estiver na tab formandos, muda para cursos
    useEffect(() => {
        if (!canSearchFormandos && activeTab === "formandos") {
            setActiveTab("cursos");
        }
    }, [canSearchFormandos, activeTab]);

    useEffect(() => {
        // Se for Salas em modo Ocupação, não precisa obrigatoriamente de query
        const isOccupancyMode = activeTab === "salas" && showOccupancy;

        if (!isOccupancyMode && (!debouncedQuery || debouncedQuery.length < 2)) {
            setResults([]);
            return;
        }

        async function fetchResults() {
            setLoading(true);
            setError("");
            try {
                let data = [];
                const q = debouncedQuery.toLowerCase();

                if (activeTab === "cursos") {
                    const res = await api.get("/Cursos");
                    const all = Array.isArray(res.data) ? res.data : [];
                    data = all.filter(
                        (c) =>
                            (c.nome || "").toLowerCase().includes(q) ||
                            (c.nivelCurso || "").toLowerCase().includes(q) ||
                            (c.area?.nome || "").toLowerCase().includes(q)
                    );
                }
                else if (activeTab === "turmas") {
                    const res = await api.get("/Turmas");
                    const all = Array.isArray(res.data) ? res.data : [];
                    data = all.filter(
                        (t) => (t.nome || "").toLowerCase().includes(q)
                    );
                }
                else if (activeTab === "salas") {
                    // Fetch salas
                    const resSalas = await api.get("/Salas");
                    let allSalas = Array.isArray(resSalas.data) ? resSalas.data : [];

                    // Filtrar por nome
                    if (q) {
                        allSalas = allSalas.filter(s => (s.nome || "").toLowerCase().includes(q));
                    }

                    // Se modo ocupação, fetch sessoes e cruzar
                    if (showOccupancy && selectedDate) {
                        const resSessoes = await api.get(`/Sessoes/date/${selectedDate}`);
                        const sessoes = Array.isArray(resSessoes.data) ? resSessoes.data : [];

                        // Mapear sessões por sala
                        const ocupacaoMap = {};
                        sessoes.forEach(sessao => {
                            if (!ocupacaoMap[sessao.salaId]) ocupacaoMap[sessao.salaId] = [];
                            ocupacaoMap[sessao.salaId].push(sessao);
                        });

                        // Enriquecer salas com info de ocupação
                        data = allSalas.map(sala => ({
                            ...sala,
                            sessoes: ocupacaoMap[sala.id] || [],
                            isOccupied: !!ocupacaoMap[sala.id]?.length
                        }));
                    } else {
                        data = allSalas;
                    }
                }
                else if (activeTab === "formandos" && canSearchFormandos) {
                    const res = await api.get(`/Profiles/formandos/search?q=${encodeURIComponent(debouncedQuery)}`);
                    data = Array.isArray(res.data) ? res.data : [];
                }

                // Slice apenas se não for modo ocupação (pois queremos ver todas as salas nesse modo)
                if (activeTab !== "salas" || !showOccupancy) {
                    setResults(data.slice(0, 10));
                } else {
                    setResults(data); // Mostrar todas as salas no modo ocupação
                }

            } catch (err) {
                console.error(err);
                setError("Erro na pesquisa.");
            } finally {
                setLoading(false);
            }
        }

        fetchResults();
    }, [debouncedQuery, activeTab, canSearchFormandos, showOccupancy, selectedDate]);

    // Render Tab Button Helper
    const TabBtn = ({ id, label, colorClass, activeClass }) => (
        <button
            onClick={() => {
                setActiveTab(id);
                setQuery("");
                setResults([]);
                if (id !== "salas") setShowOccupancy(false);
            }}
            className={`flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === id
                    ? `bg-white dark:bg-gray-800 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700 ${activeClass}`
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50"
                }`}
        >
            {label}
        </button>
    );

    return (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden mb-8">
            {/* Header / Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center border-b border-gray-100 dark:border-gray-800">
                <div className="px-6 py-4 border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Pesquisa
                    </h2>
                </div>

                <div className="flex flex-1 p-2 gap-2 bg-gray-50/30 dark:bg-gray-950/30 overflow-x-auto">
                    <TabBtn id="cursos" label="Cursos" activeClass="text-purple-700 dark:text-purple-300" />
                    <TabBtn id="turmas" label="Turmas" activeClass="text-teal-700 dark:text-teal-300" />
                    <TabBtn id="salas" label="Salas" activeClass="text-orange-700 dark:text-orange-300" />
                    {canSearchFormandos && (
                        <TabBtn id="formandos" label="Formandos" activeClass="text-blue-700 dark:text-blue-300" />
                    )}
                </div>
            </div>

            {/* Input & Controls */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={
                            activeTab === "cursos" ? "Pesquisar cursos..." :
                                activeTab === "turmas" ? "Pesquisar turmas..." :
                                    activeTab === "salas" ? "Pesquisar salas..." :
                                        "Pesquisar formandos..."
                        }
                        className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 
                       bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100
                       focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50
                       transition-all shadow-sm"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        )}
                    </div>
                </div>

                {/* Date Picker Toggle for Salas */}
                {activeTab === "salas" && (
                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-950 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setShowOccupancy(!showOccupancy)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 ${showOccupancy
                                    ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                                }`}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Ver Ocupação
                        </button>

                        {showOccupancy && (
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent text-sm border-none focus:ring-0 text-gray-700 dark:text-gray-200"
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Results */}
            {(results.length > 0 || (activeTab === "salas" && showOccupancy)) && (
                <div className="max-h-80 overflow-y-auto bg-white dark:bg-gray-900">
                    {/* Empty State Custom */}
                    {results.length === 0 && !loading ? (
                        <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                            Sem resultados encontrados.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800">
                            {results.map((item, idx) => (
                                <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-between group cursor-default">

                                    {/* --- CURSO --- */}
                                    {activeTab === "cursos" && (
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900 dark:text-gray-100">{item.nome}</div>
                                            <div className="text-xs text-gray-500">{item.area?.nome} | Nível {item.nivelCurso}</div>
                                        </div>
                                    )}

                                    {/* --- TURMA --- */}
                                    {activeTab === "turmas" && (
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900 dark:text-gray-100">{item.nome}</div>
                                            <div className="text-xs text-gray-500">
                                                {new Date(item.dataInicio).toLocaleDateString()} - {new Date(item.dataFim).toLocaleDateString()}
                                            </div>
                                        </div>
                                    )}

                                    {/* --- SALA --- */}
                                    {activeTab === "salas" && (
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full ${showOccupancy ? (item.isOccupied ? "bg-red-500" : "bg-green-500") : "bg-gray-300"}`} />
                                                    <div className="font-semibold text-gray-900 dark:text-gray-100">{item.nome}</div>
                                                    <span className="text-xs text-gray-500">Cap: {item.capacidade}</span>
                                                </div>

                                                {/* Detalhes de Ocupação */}
                                                {showOccupancy && item.isOccupied && (
                                                    <div className="text-xs text-red-600 dark:text-red-400 text-right">
                                                        {item.sessoes.map(s => (
                                                            <div key={s.id}>
                                                                {new Date(s.horarioInicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                                {new Date(s.horarioFim).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                <span className="font-medium ml-1">({s.turmaNome})</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {showOccupancy && !item.isOccupied && (
                                                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Livre</span>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* --- FORMANDO --- */}
                                    {activeTab === "formandos" && (
                                        <div className="flex-1">
                                            <div className="font-semibold text-gray-900 dark:text-gray-100">{item.nome}</div>
                                            <div className="text-xs text-gray-500">{item.turmaNome} | {item.cursoNome}</div>
                                        </div>
                                    )}

                                    {/* Botão de Ação genérico (se aplicável) */}
                                    {(activeTab === "turmas" || (activeTab === "formandos" && canSearchFormandos)) && (
                                        <button className="opacity-0 group-hover:opacity-100 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                            Ver
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
