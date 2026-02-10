// src/pages/Availability.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { getToken, getUserRoleFromToken } from "../utils/auth";

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

/* ---------------- date helpers ---------------- */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toISODate(d) {
  // yyyy-mm-dd (local)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun ... 6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
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
  const wd = d.toLocaleDateString("pt-PT", { weekday: "short" }); // "seg.", "ter.", ...
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

/* ---------------- UI ---------------- */

function HeaderIcon({ icon = "availability" }) {
  return (
    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
      {icon === "availability" ? (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M8 3v2M16 3v2M4 8h16M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 12v4l3 2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
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

/* -------- Hours pagination (porque aqui não é uma tabela normal) -------- */

function HoursPager({ page, perPage, total, onPageChange, onPerPageChange, disabled }) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.min(Math.max(1, page), totalPages);

  const from = total === 0 ? 0 : (safePage - 1) * perPage + 1;
  const to = Math.min(total, safePage * perPage);

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Horas{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {from}–{to}
          </span>{" "}
          de <span className="font-semibold text-gray-900 dark:text-gray-100">{total}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Por página</span>
          <select
            value={perPage}
            onChange={(e) => onPerPageChange(Number(e.target.value))}
            disabled={disabled}
            className="border border-gray-200 dark:border-gray-800 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-900
                       text-gray-900 dark:text-gray-100 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
          >
            {[6, 8, 10, 15].map((n) => (
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

        <div className="text-sm text-gray-600 dark:text-gray-400 px-2">
          Página <span className="font-semibold text-gray-900 dark:text-gray-100">{safePage}</span> /{" "}
          <span className="font-semibold text-gray-900 dark:text-gray-100">{totalPages}</span>
        </div>

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

/* ---------------- Main Page ---------------- */

export default function Availability() {
  const navigate = useNavigate();

  const token = getToken();
  const role = getUserRoleFromToken(token) || "User";
  const myUserId = useMemo(() => (token ? getUserIdFromToken(token) : null), [token]);

  // Só formador (o backend só deixa POST para Formador)
  const isFormador = role === "Formador";

  // Semana atual (segunda)
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));

  // Horas (ajusta se quiseres)
  const hours = useMemo(() => {
    const arr = [];
    for (let h = 8; h <= 22; h++) arr.push(h); // 08:00 -> 22:00
    return arr;
  }, []);

  // Paginação das horas
  const [hourPage, setHourPage] = useState(1);
  const [hoursPerPage, setHoursPerPage] = useState(8);

  // Dias (Mon..Sun)
  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) arr.push(addDays(weekStart, i));
    return arr;
  }, [weekStart]);

  // Backend ids
  const [formadorId, setFormadorId] = useState(null);

  // Disponibilidades (map por chave: `${yyyy-mm-dd}|${hour}`)
  const [slots, setSlots] = useState(() => new Map()); // key -> { id, ...dto }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Drag select state
  const dragRef = useRef({
    active: false,
    mode: "add", // "add" | "remove"
    visited: new Set(),
  });

  const weekKeySet = useMemo(() => {
    const set = new Set();
    for (const d of days) {
      const iso = toISODate(d);
      for (const h of hours) set.add(`${iso}|${h}`);
    }
    return set;
  }, [days, hours]);

  const hourTotal = hours.length;
  const hourTotalPages = Math.max(1, Math.ceil(hourTotal / hoursPerPage));

  useEffect(() => {
    // reset da paginação quando muda o tamanho/página da semana
    setHourPage(1);
  }, [weekStart, hoursPerPage]);

  useEffect(() => {
    if (hourPage > hourTotalPages) setHourPage(hourTotalPages);
  }, [hourPage, hourTotalPages]);

  const pagedHours = useMemo(() => {
    const start = (hourPage - 1) * hoursPerPage;
    return hours.slice(start, start + hoursPerPage);
  }, [hours, hourPage, hoursPerPage]);

  async function resolveFormadorId() {
    if (!token) throw new Error("Sem token.");
    if (!myUserId) throw new Error("Não consegui ler o teu UserId do token.");

    const r = await api.get(`/Profiles/formador/${myUserId}`);
    const fid = r?.data?.id;
    const uid = r?.data?.userId;

    if (!Number.isFinite(Number(fid))) {
      if (Number.isFinite(Number(uid))) return Number(uid);
      throw new Error("Não encontrei o FormadorId no /Profiles/formador/{userId} (campo 'id').");
    }

    return Number(fid);
  }

  async function loadWeek() {
    setError("");
    setInfo("");
    setLoading(true);

    try {
      if (!token) throw new Error("Sem token. Faz login novamente.");
      if (!isFormador) throw new Error("Acesso: esta página é para Formadores.");

      const fid = formadorId ?? (await resolveFormadorId());
      if (!formadorId) setFormadorId(fid);

      const res = await api.get(`/Disponibilidades/formador/${fid}`);
      const arr = Array.isArray(res.data) ? res.data : [];

      const map = new Map();

      for (const item of arr) {
        const id = item?.id;

        // Backend envia "dataInicio" (DateTime ISO)
        let dataISO = null;
        let hour = null;

        if (item.dataInicio) {
          const d = new Date(item.dataInicio);
          dataISO = toISODate(d);
          hour = d.getHours();
        } else {
          // fallback legacy
          const rawDate = item?.data || item?.dia || item?.date;
          const rawTime = item?.horaInicio || item?.inicio || item?.startTime;
          if (rawDate && rawTime) {
            const d = new Date(rawDate);
            dataISO = toISODate(d);
            hour = Number(safeStr(rawTime).slice(0, 2));
          }
        }

        if (!dataISO || hour === null || Number.isNaN(Number(hour))) continue;

        const key = `${dataISO}|${Number(hour)}`;
        if (!weekKeySet.has(key)) continue;

        map.set(key, { ...item, id });
      }

      setSlots(map);
    } catch (e) {
      setError(extractError(e, "Falha ao carregar disponibilidades."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      navigate("/", { replace: true });
      return;
    }
    loadWeek();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  // Fecha drag ao largar fora
  useEffect(() => {
    const onUp = () => endDrag();
    window.addEventListener("mouseup", onUp);
    return () => window.removeEventListener("mouseup", onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cellKey(dateObj, hour) {
    return `${toISODate(dateObj)}|${hour}`;
  }

  function isAvailable(key) {
    return slots.has(key);
  }

  async function createSlot(dateObj, hour) {
    if (!isFormador) return;

    const fid = formadorId ?? (await resolveFormadorId());
    if (!formadorId) setFormadorId(fid);

    if (!fid) throw new Error("ID de Formador não encontrado.");

    const isoDate = toISODate(dateObj);
    const dataInicio = `${isoDate}T${pad2(hour)}:00:00`;
    const dataFim = `${isoDate}T${pad2(hour + 1)}:00:00`;

    const dto = {
      entidadeId: fid,
      tipoEntidade: "Formador",
      formadorId: fid,
      salaId: null,
      dataInicio,
      dataFim,
      disponivel: true,
    };

    const res = await api.post("/Disponibilidades", dto);
    return res?.data;
  }

  async function deleteSlot(id) {
    await api.delete(`/Disponibilidades/${id}`);
  }

  function beginDrag(dateObj, hour) {
    if (!isFormador || saving) return;

    const key = cellKey(dateObj, hour);
    const currently = isAvailable(key);

    dragRef.current.active = true;
    dragRef.current.mode = currently ? "remove" : "add";
    dragRef.current.visited = new Set([key]);

    applyDragAction(dateObj, hour);
  }

  function enterDrag(dateObj, hour) {
    if (!dragRef.current.active || !isFormador || saving) return;

    const key = cellKey(dateObj, hour);
    if (dragRef.current.visited.has(key)) return;

    dragRef.current.visited.add(key);
    applyDragAction(dateObj, hour);
  }

  async function applyDragAction(dateObj, hour) {
    const key = cellKey(dateObj, hour);
    const existing = slots.get(key);

    if (dragRef.current.mode === "add") {
      if (existing) return;

      setError("");
      setInfo("");
      setSaving(true);
      try {
        const created = await createSlot(dateObj, hour);
        if (created?.id) {
          setSlots((prev) => {
            const next = new Map(prev);
            next.set(key, created);
            return next;
          });
        } else {
          await loadWeek();
        }
      } catch (e) {
        setError(extractError(e, "Falha ao criar disponibilidades."));
      } finally {
        setSaving(false);
      }
    } else {
      if (!existing?.id) return;

      setError("");
      setInfo("");
      setSaving(true);
      try {
        await deleteSlot(existing.id);
        setSlots((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      } catch (e) {
        setError(extractError(e, "Falha ao apagar disponibilidades."));
      } finally {
        setSaving(false);
      }
    }
  }

  function endDrag() {
    dragRef.current.active = false;
    dragRef.current.visited = new Set();
  }

  function goToday() {
    setWeekStart(startOfWeekMonday(new Date()));
  }

  const weekLabel = useMemo(() => {
    const start = days[0];
    const end = days[6];
    if (!start || !end) return "";
    return `${formatPtShort(start)} → ${formatPtShort(end)}`;
  }, [days]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur-xl dark:bg-gray-900/90 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <HeaderIcon icon="availability" />
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Disponibilidades</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Marca blocos horários disponíveis (podes clicar e arrastar).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Btn onClick={() => setWeekStart((w) => addDays(w, -7))} disabled={loading || saving}>
              ← Semana
            </Btn>

            <PrimaryBtn tone="blue" onClick={goToday} disabled={loading || saving}>
              Hoje
            </PrimaryBtn>

            <Btn onClick={() => setWeekStart((w) => addDays(w, 7))} disabled={loading || saving}>
              Semana →
            </Btn>

            <Btn onClick={() => navigate("/dashboard")} className="ml-0 md:ml-2">
              ← Voltar
            </Btn>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Alerts */}
        {!isFormador && (
          <div className="mb-5 bg-red-50 border border-red-200 dark:bg-red-950/25 dark:border-red-900/40 rounded-xl p-4 text-sm text-red-700 dark:text-red-200">
            Esta página é apenas para o role <b>Formador</b>. O teu role atual é: <b>{role}</b>
          </div>
        )}

        {(error || info) && (
          <div className="mb-5 space-y-3">
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

        {/* Legend + Week info */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-5 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span className="inline-block w-3 h-3 rounded bg-emerald-500" />
                Disponível
              </div>

              <div className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span className="inline-block w-3 h-3 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                Não definido
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                Semana:{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">{weekLabel}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(loading || saving) && (
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  {loading ? "A carregar..." : "A guardar..."}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <HoursPager
              page={hourPage}
              perPage={hoursPerPage}
              total={hours.length}
              onPageChange={setHourPage}
              onPerPageChange={(n) => {
                setHoursPerPage(n);
                setHourPage(1);
              }}
              disabled={loading || saving}
            />
          </div>

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Dica: se começares o arrasto num bloco já marcado, o arrasto apaga. Se começares num bloco vazio, marca.
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          {/* Header row */}
          <div className="grid" style={{ gridTemplateColumns: `90px repeat(7, minmax(130px, 1fr))` }}>
            <div className="p-3 text-xs font-semibold text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/30">
              Hora
            </div>

            {days.map((d) => (
              <div
                key={toISODate(d)}
                className="p-3 text-xs font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/30"
              >
                <div className="flex items-center justify-between">
                  <span>{formatDayLabel(d)}</span>
                  <span className="text-gray-500 dark:text-gray-400">{formatPtShort(d)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Body */}
          {loading ? (
            <div className="p-10 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="ml-3 text-gray-600 dark:text-gray-300">A carregar...</span>
            </div>
          ) : (
            <div className="select-none">
              {pagedHours.map((h) => (
                <div
                  key={h}
                  className="grid border-t border-gray-200 dark:border-gray-800"
                  style={{ gridTemplateColumns: `90px repeat(7, minmax(130px, 1fr))` }}
                >
                  {/* Hour label */}
                  <div className="p-3 text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-950/20 border-r border-gray-200 dark:border-gray-800 flex items-center justify-center">
                    {pad2(h)}:00
                  </div>

                  {/* Cells */}
                  {days.map((d) => {
                    const key = cellKey(d, h);
                    const available = isAvailable(key);

                    return (
                      <div
                        key={key}
                        className={[
                          "relative border-r border-gray-200 dark:border-gray-800 h-12",
                          "transition-colors",
                          available
                            ? "bg-emerald-500/15 hover:bg-emerald-500/20"
                            : "bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/40",
                          !isFormador || saving ? "opacity-60 cursor-not-allowed" : "cursor-pointer",
                        ].join(" ")}
                        onMouseDown={() => beginDrag(d, h)}
                        onMouseEnter={() => enterDrag(d, h)}
                        onMouseUp={() => endDrag()}
                        title={available ? "Disponível (clicar para remover)" : "Não definido (clicar para marcar disponível)"}
                      >
                        {available && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="px-2 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-bold shadow-sm">
                              Disponível
                            </span>
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
      </div>
    </div>
  );
}
