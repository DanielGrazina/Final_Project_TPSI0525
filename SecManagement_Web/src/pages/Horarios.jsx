// src/pages/Horarios.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { getToken, getUserRoleFromToken } from "../utils/auth";

/* ---------------- helpers (iguais ao teu estilo) ---------------- */

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

function parseHour(value) {
  // aceita "09:00:00", "09:00", "9", 9, Date etc
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.getHours();
  }

  if (typeof value === "number" && Number.isFinite(value)) return value;

  const s = safeStr(value).trim();
  if (!s) return null;

  // "2026-02-06T09:00:00"
  const d = new Date(s);
  if (!Number.isNaN(d.getTime()) && s.includes("T")) return d.getHours();

  // "09:00:00" / "09:00"
  const hh = Number(s.slice(0, 2));
  if (Number.isFinite(hh)) return hh;

  return null;
}

function parseDateOnly(value) {
  if (!value) return null;

  // Date instance
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value;
  }

  const s = safeStr(value);

  // tenta como Date
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;

  return null;
}

/* ---------------- normalização de Sessões ---------------- */

function normalizeSessao(raw) {
  // tenta apanhar campos típicos, sem depender de nomes exatos
  const id = raw?.id ?? raw?.sessionId ?? raw?.sessaoId;

  const dtStart =
    raw?.dataHoraInicio ??
    raw?.dataInicio ??
    raw?.inicio ??
    raw?.start ??
    raw?.startDateTime ??
    raw?.data; // às vezes "data" já inclui hora

  const dtEnd =
    raw?.dataHoraFim ??
    raw?.dataFim ??
    raw?.fim ??
    raw?.end ??
    raw?.endDateTime;

  // se não vier datetime completo, tenta data + horaInicio/horaFim
  const datePart =
    raw?.data ??
    raw?.dia ??
    raw?.date ??
    raw?.dataSessao;

  const horaInicio =
    raw?.horaInicio ??
    raw?.inicioHora ??
    raw?.startTime;

  const horaFim =
    raw?.horaFim ??
    raw?.fimHora ??
    raw?.endTime;

  let start = parseDateOnly(dtStart);
  let end = parseDateOnly(dtEnd);

  if (!start) {
    const d = parseDateOnly(datePart);
    const h = parseHour(horaInicio);
    if (d && Number.isFinite(h)) {
      start = new Date(d);
      start.setHours(h, 0, 0, 0);
    }
  }

  if (!end && start) {
    const h2 = parseHour(horaFim);
    if (Number.isFinite(h2)) {
      end = new Date(start);
      end.setHours(h2, 0, 0, 0);
    } else {
      // default 1h
      end = new Date(start);
      end.setHours(start.getHours() + 1, 0, 0, 0);
    }
  }

  if (!start) return null;

  const turma =
    raw?.turmaNome ??
    raw?.turma ??
    raw?.nomeTurma;

  const sala =
    raw?.salaNome ??
    raw?.sala ??
    raw?.roomNome ??
    raw?.room;

  const modulo =
    raw?.moduloNome ??
    raw?.modulo ??
    raw?.moduleNome ??
    raw?.module;

  const formador =
    raw?.formadorNome ??
    raw?.professorNome ??
    raw?.teacherNome ??
    raw?.formador;

  return {
    id: id ?? `${start.toISOString()}-${Math.random().toString(16).slice(2)}`,
    start,
    end,
    turma: safeStr(turma || "—"),
    sala: safeStr(sala || "—"),
    modulo: safeStr(modulo || "Aula"),
    formador: safeStr(formador || "—"),
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

  // ids
  const [formadorId, setFormadorId] = useState(null);
  const [formandoId, setFormandoId] = useState(null);
  const [turmaId, setTurmaId] = useState(null);

  // sessões normalizadas
  const [sessions, setSessions] = useState([]);

  // grid: key `${yyyy-mm-dd}|${hour}` -> array sessions
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

    // ordenar dentro da célula (por start)
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

    // Formador -> Profiles/formador/{userId} e apanha id
    if (isFormador) {
      const r = await api.get(`/Profiles/formador/${myUserId}`);
      const fid = r?.data?.id;
      if (!Number.isFinite(Number(fid))) {
        throw new Error("Não encontrei o FormadorId no /Profiles/formador/{userId} (campo 'id').");
      }
      setFormadorId(Number(fid));
      return { formadorId: Number(fid) };
    }

    // Formando -> Profiles/formando/{userId} e tenta apanhar id e turma
    if (isFormando) {
      const r = await api.get(`/Profiles/formando/${myUserId}`);
      const foid = r?.data?.id;
      const tid = r?.data?.turmaId ?? r?.data?.turmaAtualId;

      if (Number.isFinite(Number(foid))) setFormandoId(Number(foid));
      if (Number.isFinite(Number(tid))) setTurmaId(Number(tid));

      return {
        formandoId: Number.isFinite(Number(foid)) ? Number(foid) : null,
        turmaId: Number.isFinite(Number(tid)) ? Number(tid) : null,
      };
    }

    return {};
  }

  async function fetchSessionsForMe(ids) {
    // ⚠️ não sabemos os endpoints exatos do teu SessionsController,
    // então tentamos vários comuns e usamos o que funcionar.
    // Dá “zero perguntas” e tu só ajustas se algum endpoint tiver nome diferente.

    const tries = [];

    // 1) endpoint genérico
    tries.push(api.get("/Sessions"));

    // 2) por formador / formando / turma (os mais prováveis)
    if (ids?.formadorId) {
      tries.push(api.get(`/Sessions/formador/${ids.formadorId}`));
      tries.push(api.get(`/Sessions/professor/${ids.formadorId}`));
    }
    if (ids?.formandoId) {
      tries.push(api.get(`/Sessions/formando/${ids.formandoId}`));
      tries.push(api.get(`/Sessions/aluno/${ids.formandoId}`));
    }
    if (ids?.turmaId) {
      tries.push(api.get(`/Sessions/turma/${ids.turmaId}`));
      tries.push(api.get(`/Sessions/class/${ids.turmaId}`));
    }

    const settled = await Promise.allSettled(tries);

    // escolhe a primeira resposta fulfilled que seja array
    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      const data = r.value?.data;
      if (Array.isArray(data)) return data;
    }

    // se nenhuma devolveu array, devolve erro mais útil possível
    const firstErr = settled.find((x) => x.status === "rejected");
    if (firstErr?.status === "rejected") throw firstErr.reason;

    // fallback: vazio
    return [];
  }

  async function loadWeek() {
    setLoading(true);
    setError("");

    try {
      if (!token) throw new Error("Sem token. Faz login novamente.");

      if (!isFormador && !isFormando) {
        throw new Error("Esta página é para Formandos e Formadores.");
      }

      const ids = await resolveMyIds();
      const raw = await fetchSessionsForMe(ids);

      const norm = raw
        .map(normalizeSessao)
        .filter(Boolean);

      // filtra só para a semana atual (segunda..domingo)
      const start = new Date(weekStart);
      const end = addDays(start, 7);
      const weekOnly = norm.filter((s) => s.start >= start && s.start < end);

      setSessions(weekOnly);
    } catch (e) {
      setError(extractError(e, "Falha ao carregar o horário."));
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
          <div>
            <h1 className="text-xl font-bold">Horários</h1>
            <p className="text-sm text-gray-300">
              {isFormador ? "O teu horário de sessões." : "O teu horário de aulas."}
            </p>
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
                        className="relative border-r border-white/10 h-12 bg-white/0 hover:bg-white/5 transition-colors"
                        title={cellSessions.length ? "Aula/Sessão marcada" : "Livre"}
                      >
                        {cellSessions.length > 0 && (
                          <div className="absolute inset-0 p-1 flex flex-col gap-1 overflow-hidden">
                            {cellSessions.slice(0, 2).map((s) => {
                              const hh = pad2(s.start.getHours());
                              const mm = pad2(s.start.getMinutes());
                              const labelTop = `${hh}:${mm} • ${s.modulo}`;

                              // Para formando: mostra sala + formador
                              // Para formador: mostra turma + sala
                              const sub = isFormando
                                ? `Sala: ${s.sala} • ${s.formador !== "—" ? `Formador: ${s.formador}` : ""}`
                                : `Turma: ${s.turma} • Sala: ${s.sala}`;

                              return (
                                <div
                                  key={s.id}
                                  className="rounded-lg bg-blue-500/20 border border-blue-500/30 px-2 py-1"
                                >
                                  <div className="text-[11px] font-bold text-blue-100 truncate">
                                    {labelTop}
                                  </div>
                                  <div className="text-[10px] text-blue-200/80 truncate">
                                    {sub}
                                  </div>
                                </div>
                              );
                            })}

                            {cellSessions.length > 2 && (
                              <div className="text-[10px] text-blue-200/80 px-2">
                                +{cellSessions.length - 2} mais…
                              </div>
                            )}
                          </div>
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
          Nota: se a API devolver nomes de campos diferentes no SessionsController, diz-me o DTO/JSON da sessão (um exemplo)
          e eu ajusto o normalizador para ficar 100% certo.
        </div>
      </div>
    </div>
  );
}
