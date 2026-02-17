import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { getToken, getUserRoleFromToken } from "../utils/auth";
import BurgerMenu from "../components/BurgerMenu";

/* ---------------- helpers ---------------- */

function safeStr(x) {
  return (x ?? "").toString();
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

/* ---------------- date helpers ---------------- */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatPtShort(d) {
  return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit" });
}

function formatDayLabel(d) {
  const wd = d.toLocaleDateString("pt-PT", { weekday: "short" });
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

/* ---------------- normalização de Sessões ---------------- */

function normalizeSessao(raw) {
  if (!raw) return null;

  // --- 1. DATAS ---
  // O Backend envia "horarioInicio" e "horarioFim"
  const rawStart = raw.HorarioInicio || raw.horarioInicio || raw.DataInicio || raw.start;
  const rawEnd = raw.HorarioFim || raw.horarioFim || raw.DataFim || raw.end;

  if (!rawStart) return null;

  const start = new Date(rawStart);
  let end = rawEnd ? new Date(rawEnd) : null;

  // Se a data for inválida ou nula, definir 1h de duração por defeito
  if (!end || isNaN(end.getTime())) {
    end = new Date(start);
    end.setHours(start.getHours() + 1);
  }

  // --- 2. ID ---
  const id = raw.Id || raw.id || `temp-${start.getTime()}`;

  // --- 3. CAMPOS DE TEXTO (Aqui estava o problema provável) ---

  // TURMA
  let turma = "—";
  if (raw.TurmaNome || raw.turmaNome) turma = raw.TurmaNome || raw.turmaNome;
  else if (raw.Turma?.Nome) turma = raw.Turma.Nome;

  // SALA
  let sala = "—";
  if (raw.SalaNome || raw.salaNome) sala = raw.SalaNome || raw.salaNome;
  else if (raw.Sala?.Nome) sala = raw.Sala.Nome;

  // MÓDULO
  let modulo = "Aula";
  if (raw.ModuloNome || raw.moduloNome) modulo = raw.ModuloNome || raw.moduloNome;
  else if (raw.UnidadeCurricularNome) modulo = raw.UnidadeCurricularNome;

  // FORMADOR (Essencial para o aluno saber quem dá a aula)
  let formador = "—";
  if (raw.FormadorNome || raw.formadorNome) formador = raw.FormadorNome || raw.formadorNome;
  else if (raw.User?.Nome) formador = raw.User.Nome;

  return {
    id: String(id),
    start,
    end,
    turma: safeStr(turma),
    sala: safeStr(sala),
    modulo: safeStr(modulo),
    formador: safeStr(formador),
    raw,
  };
}

/* ---------------- Main Page ---------------- */

export default function Horarios() {
  const navigate = useNavigate();

  const token = getToken();
  const role = getUserRoleFromToken(token) || "User";
  const myUserId = useMemo(() => (token ? getUserIdFromToken(token) : null), [token]);

  const isFormador = role === "Formador";
  const isFormando = role === "Formando";

  // Semana
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));

  const hours = useMemo(() => {
    const arr = [];
    for (let h = 8; h <= 22; h++) arr.push(h);
    return arr;
  }, []);

  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) arr.push(addDays(weekStart, i));
    return arr;
  }, [weekStart]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formadorId, setFormadorId] = useState(null);
  const [formandoId, setFormandoId] = useState(null);
  const [turmaId, setTurmaId] = useState(null);

  const [sessions, setSessions] = useState([]);

  // Grid
  const grid = useMemo(() => {
    const map = new Map();

    const weekSet = new Set();
    for (const d of days) {
      const iso = toISODate(d);
      for (const h of hours) weekSet.add(`${iso}|${h}`);
    }

    for (const s of sessions) {
      if (!s?.start) continue;
      const iso = toISODate(s.start);
      const h = s.start.getHours();
      const key = `${iso}|${h}`;

      if (!weekSet.has(key)) continue;

      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }

    // ordenar
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.start - b.start);
      map.set(k, arr);
    }

    return map;
  }, [sessions, days, hours]);

  function cellKey(dateObj, hour) {
    return `${toISODate(dateObj)}|${hour}`;
  }

  function goToday() {
    setWeekStart(startOfWeekMonday(new Date()));
  }

  async function resolveMyIds() {
    if (!token) throw new Error("Sem token. Faz login novamente.");
    if (!myUserId) throw new Error("Não consegui ler o teu UserId do token.");

    // --- LÓGICA FORMADOR ---
    if (isFormador) {
      const r = await api.get(`/Profiles/formador/${myUserId}`);
      const fid = r?.data?.id || r?.data?.Id;
      if (Number.isFinite(Number(fid))) {
        setFormadorId(Number(fid));
        return { formadorId: Number(fid) };
      }
    }

    // --- LÓGICA FORMANDO (AQUI ESTÁ O PROBLEMA) ---
    if (isFormando) {
      const r = await api.get(`/Profiles/formando/${myUserId}`);

      // Tentar ler ID do Formando
      const foid = r?.data?.id || r?.data?.Id;

      // Tentar ler ID da Turma (Várias hipoteses de nome)
      const tid = r?.data?.turmaId || r?.data?.TurmaId || r?.data?.turmaAtualId;

      if (Number.isFinite(Number(foid))) setFormandoId(Number(foid));

      if (Number.isFinite(Number(tid))) {
        setTurmaId(Number(tid));
      } else {
        console.warn("AVISO: Este aluno não tem 'turmaId' no perfil. Está inscrito numa turma?");
      }

      return {
        formandoId: Number.isFinite(Number(foid)) ? Number(foid) : null,
        turmaId: Number.isFinite(Number(tid)) ? Number(tid) : null,
      };
    }

    return {};
  }

  // --- FUNÇÃO CORRIGIDA: Usa /Sessoes e query string ---
  async function fetchSessionsForMe(ids, start, end) {
    // Converter datas para ISO string (yyyy-MM-dd)
    const s = toISODate(start);
    const e = toISODate(end);
    const query = `?start=${s}&end=${e}`;

    // 1. Se for Formador
    if (isFormador && ids.formadorId) {
      const res = await api.get(`/Sessoes/formador/${ids.formadorId}${query}`);
      return res.data;
    }

    // 2. Se for Formando (Aluno) - vê horário da TURMA
    if (isFormando && ids.turmaId) {
      const res = await api.get(`/Sessoes/turma/${ids.turmaId}${query}`);
      return res.data;
    }

    return [];
  }

  // --- FUNÇÃO CORRIGIDA: Filtro e datas ---
  async function loadWeek() {
    setLoading(true);
    setError("");

    try {
      if (!token) throw new Error("Sem token. Faz login novamente.");

      if (!isFormador && !isFormando) {
        throw new Error("Esta página é para Formandos e Formadores.");
      }

      const ids = await resolveMyIds();

      // Calcular intervalo correto da semana
      const start = new Date(weekStart);
      const end = addDays(start, 7);

      // Buscar dados
      const raw = await fetchSessionsForMe(ids, start, end);

      if (!Array.isArray(raw)) {
        console.warn("API não devolveu array:", raw);
        setSessions([]);
        return;
      }

      // Normalizar
      const norm = raw
        .map(normalizeSessao)
        .filter(Boolean);

      // Filtro de segurança (para garantir que só mostramos a semana certa)
      // Ajustamos as horas para apanhar o dia completo
      const filterStart = new Date(weekStart);
      filterStart.setHours(0, 0, 0, 0);

      const filterEnd = addDays(filterStart, 7);
      filterEnd.setHours(23, 59, 59, 999);

      const weekOnly = norm.filter((s) => s.start >= filterStart && s.start <= filterEnd);

      setSessions(weekOnly);
    } catch (e) {
      if (isFormando && !formandoId) {
        setError("Não foi possível encontrar o teu perfil de aluno.");
      } else if (isFormando && !turmaId) {
        setError("Ainda não estás colocado em nenhuma turma, por isso não tens horário.");
      } else {
        setError(extractError(e, "Falha ao carregar o horário."));
      }
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BurgerMenu />
            <div>
              <h1 className="text-xl font-bold">Horários</h1>
              <p className="text-sm text-gray-300">
                {isFormador ? "O teu horário de sessões." : "O teu horário de aulas."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              disabled={loading}
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={goToday}
              className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              disabled={loading}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              disabled={loading}
            >
              Next →
            </button>

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
        {error && (
          <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Legend / status */}
        <div className="mb-4 flex items-center gap-4 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-blue-500" />
            Sessão / Aula marcada
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-white/10 border border-white/10" />
            Livre
          </div>

          {loading && (
            <div className="ml-auto flex items-center gap-2 text-xs text-gray-300">
              <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              A carregar...
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="my-6 h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />

        {/* Table/Grid */}
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
          {/* Top header row */}
          <div className="grid" style={{ gridTemplateColumns: `90px repeat(7, minmax(130px, 1fr))` }}>
            <div className="p-3 text-xs font-semibold text-gray-300 border-b border-white/10 bg-gray-950/40">
              Hora
            </div>

            {days.map((d) => (
              <div
                key={toISODate(d)}
                className="p-3 text-xs font-semibold text-gray-200 border-b border-white/10 bg-gray-950/40"
              >
                <div className="flex items-center justify-between">
                  <span>{formatDayLabel(d)}</span>
                  <span className="text-gray-400">{formatPtShort(d)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Body */}
          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-300">A carregar...</span>
            </div>
          ) : (
            <div className="select-none">
              {hours.map((h) => (
                <div
                  key={h}
                  className="grid border-t border-white/10"
                  style={{ gridTemplateColumns: `90px repeat(7, minmax(130px, 1fr))` }}
                >
                  {/* Hour label */}
                  <div className="p-3 text-sm text-gray-300 bg-gray-950/20 border-r border-white/10 flex items-center justify-center">
                    {pad2(h)}:00
                  </div>

                  {/* Cells */}
                  {days.map((d) => {
                    const key = cellKey(d, h);
                    const cellSessions = grid.get(key) || [];

                    return (
                      <div
                        key={key}
                        // 1. IMPORTANTE: overflow-visible para permitir que o card saia da célula
                        // h-14 define a altura fixa da linha (aprox 56px)
                        className="relative border-r border-white/10 h-14 hover:bg-white/5 transition-colors z-0"
                        style={{ overflow: 'visible' }}
                        title={cellSessions.length ? "Aula/Sessão marcada" : "Livre"}
                      >
                        {cellSessions.length > 0 && (
                          <>
                            {cellSessions.map((s) => {
                              // Calcular duração
                              const durationMs = s.end - s.start;
                              const durationHours = durationMs > 0 ? durationMs / (1000 * 60 * 60) : 1;

                              // 2. ESTILO DO WRAPPER (Posicionamento)
                              // O Wrapper ocupa a altura total das N células.
                              // O zIndex deve ser alto (20) para ficar por cima das linhas de baixo.
                              const wrapperStyle = {
                                height: `calc(${durationHours * 100}% + ${Math.floor(durationHours)}px)`,
                                zIndex: 20,
                              };

                              const hh = pad2(s.start.getHours());
                              const mm = pad2(s.start.getMinutes());
                              const labelTop = `${hh}:${mm} • ${s.modulo}`;

                              const sub = isFormando
                                ? `Sala: ${s.sala}`
                                : `Turma: ${s.turma} • Sala: ${s.sala}`;

                              return (
                                <div
                                  key={s.id}
                                  style={wrapperStyle}
                                  // 3. ABSOLUTE TOP-0 LEFT-0
                                  // Removemos o 'inset-0' e o padding do pai. 
                                  // O padding (p-1) agora é aplicado aqui para dar margem visual, 
                                  // mas a altura real é calculada sobre a célula inteira.
                                  className="absolute top-0 left-0 w-full p-1 pointer-events-none"
                                >
                                  {/* 4. O CARTÃO VISUAL (Blue Box) */}
                                  {/* pointer-events-auto reativa os cliques no cartão */}
                                  <div className="h-full w-full rounded-lg bg-blue-600 border border-blue-400/50 shadow-xl overflow-hidden pointer-events-auto relative group hover:z-30 transition-all cursor-pointer">

                                    {/* Conteúdo do Cartão */}
                                    <div className="px-2 py-1">
                                      <div className="text-[11px] font-bold text-white leading-tight">
                                        {labelTop}
                                      </div>
                                      <div className="text-[10px] text-blue-100/90 mt-0.5 truncate">
                                        {sub}
                                      </div>

                                      {isFormando && s.formador !== "—" && (
                                        <div className="text-[10px] text-blue-200 mt-0.5 truncate italic">
                                          Prof. {s.formador.split(' ')[0]}
                                        </div>
                                      )}
                                    </div>

                                    {/* Tooltip on Hover (útil para aulas pequenas) */}
                                    <div className="hidden group-hover:block absolute left-0 top-full mt-1 w-max max-w-[200px] bg-gray-900 border border-white/20 text-white text-xs p-2 rounded shadow-xl z-50">
                                      <div className="font-bold mb-1">{s.modulo}</div>
                                      <div>{sub}</div>
                                      <div>{pad2(s.start.getHours())}:{pad2(s.start.getMinutes())} - {pad2(s.end.getHours())}:{pad2(s.end.getMinutes())}</div>
                                    </div>

                                  </div>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* footer hint */}
        <div className="mt-4 text-xs text-gray-400">
          Nota: O horário baseia-se na tua colocação atual (Turma ou Atribuição como Formador).
        </div>
      </div>
    </div>
  );
}