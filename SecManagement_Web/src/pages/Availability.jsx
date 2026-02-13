// src/pages/Availability.jsx
import { useEffect, useMemo, useRef, useState } from "react";
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
  const day = d.getDay(); // 0=Sun .. 6=Sat
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

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

/* ---------------- UI ---------------- */

function HeaderIcon() {
  return (
    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
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
    </div>
  );
}

function Btn({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={[
        "px-4 py-2 rounded-lg border text-sm font-semibold transition",
        "border-gray-200 text-gray-700 hover:bg-gray-50",
        "dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800",
        "active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function DangerBtn({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={[
        "px-4 py-2 rounded-lg font-semibold text-white transition",
        "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700",
        "shadow-lg shadow-red-500/20 hover:shadow-xl active:scale-95",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

function PrimaryBtn({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={[
        "px-4 py-2 rounded-lg font-semibold text-white transition",
        "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800",
        "shadow-lg shadow-blue-500/25 hover:shadow-xl active:scale-95",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

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

  const isFormador = role === "Formador";

  // Semana
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));

  // Horas base
  const allHours = useMemo(() => {
    const arr = [];
    for (let h = 8; h <= 22; h++) arr.push(h);
    return arr;
  }, []);

  // Paginação
  const [hourPage, setHourPage] = useState(1);
  const [hoursPerPage, setHoursPerPage] = useState(15);

  // Dias
  const days = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 7; i++) arr.push(addDays(weekStart, i));
    return arr;
  }, [weekStart]);

  // Estado backend
  const [formadorId, setFormadorId] = useState(null);
  const [items, setItems] = useState([]); // intervalos
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  // Drag state (ref + state para preview)
  const dragRef = useRef({
    active: false,
    mode: "add", // add | remove
    dateISO: null,
    startHour: null,
    currentHour: null,
    removeId: null,
  });

  const [dragUI, setDragUI] = useState(null); // {active, mode, dateISO, startH, endH, removeId}

  // layout
  const rowH = 56;
  const hourStart = useMemo(() => allHours[0], [allHours]);
  const hourEnd = useMemo(() => allHours[allHours.length - 1] + 1, [allHours]); // exclusivo

  // paginação
  const hourTotal = allHours.length;
  const totalPages = Math.max(1, Math.ceil(hourTotal / hoursPerPage));

  useEffect(() => setHourPage(1), [weekStart, hoursPerPage]);
  useEffect(() => {
    if (hourPage > totalPages) setHourPage(totalPages);
  }, [hourPage, totalPages]);

  const visibleHours = useMemo(() => {
    const start = (hourPage - 1) * hoursPerPage;
    return allHours.slice(start, start + hoursPerPage);
  }, [allHours, hourPage, hoursPerPage]);

  const visibleStartHour = useMemo(() => visibleHours[0] ?? hourStart, [visibleHours, hourStart]);
  const visibleEndHour = useMemo(
    () => (visibleHours[visibleHours.length - 1] ?? hourStart) + 1,
    [visibleHours, hourStart]
  );

  const weekRange = useMemo(() => {
    const start = days[0];
    const end = days[6];
    if (!start || !end) return "";
    return `${formatPtShort(start)} → ${formatPtShort(end)}`;
  }, [days]);

  async function resolveFormadorId() {
    if (!token) throw new Error("Sem token.");
    if (!myUserId) throw new Error("Não consegui ler o teu UserId do token.");

    const r = await api.get(`/Profiles/formador/${myUserId}`);
    const fid = r?.data?.id;
    if (!Number.isFinite(Number(fid))) throw new Error("Não encontrei o FormadorId no Profile.");
    return Number(fid);
  }

  function makeDateTimeISO(dateISO, hour) {
    return `${dateISO}T${pad2(hour)}:00:00`;
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

      const startISO = toISODate(days[0]);
      const endISO = toISODate(addDays(days[6], 1)); // exclusivo

      const filtered = arr.filter((it) => {
        const a = it?.dataInicio ? new Date(it.dataInicio) : null;
        const b = it?.dataFim ? new Date(it.dataFim) : null;
        if (!a || !b || Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;

        const aISO = toISODate(a);
        const bISO = toISODate(b);

        return aISO >= startISO && aISO < endISO && bISO >= startISO;
      });

      setItems(filtered);
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

  // Cancelar marcação
  function cancelDrag(message = "Marcação cancelada.") {
    dragRef.current.active = false;
    dragRef.current.mode = "add";
    dragRef.current.dateISO = null;
    dragRef.current.startHour = null;
    dragRef.current.currentHour = null;
    dragRef.current.removeId = null;
    setDragUI(null);

    setInfo(message);
    setTimeout(() => setInfo(""), 900);
  }

  // ESC para cancelar
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && dragRef.current.active) {
        e.preventDefault();
        cancelDrag("Marcação cancelada (ESC).");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fechar drag se largar fora
  useEffect(() => {
    const up = () => endDrag();
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Converte items em blocos por dia
  const blocksByDay = useMemo(() => {
    const map = new Map();
    for (const d of days) map.set(toISODate(d), []);

    for (const it of items) {
      if (!it?.dataInicio || !it?.dataFim) continue;
      const s = new Date(it.dataInicio);
      const e = new Date(it.dataFim);
      if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) continue;

      const dateISO = toISODate(s);
      const startH = s.getHours();
      const endH = Math.max(e.getHours(), startH + 1);

      const arr = map.get(dateISO);
      if (!arr) continue;

      arr.push({ id: it.id, dateISO, startH, endH });
    }

    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.startH - b.startH);
      map.set(k, arr);
    }

    return map;
  }, [items, days]);

  function findBlockAt(dateISO, hour) {
    const arr = blocksByDay.get(dateISO) || [];
    return arr.find((b) => hour >= b.startH && hour < b.endH) || null;
  }

  async function createInterval(dateISO, startH, endH) {
    const fid = formadorId ?? (await resolveFormadorId());
    if (!formadorId) setFormadorId(fid);

    const dto = {
      entidadeId: fid,
      tipoEntidade: "Formador",
      formadorId: fid,
      salaId: null,
      dataInicio: makeDateTimeISO(dateISO, startH),
      dataFim: makeDateTimeISO(dateISO, endH),
      disponivel: true,
    };

    await api.post("/Disponibilidades", dto);
  }

  async function deleteInterval(id) {
    await api.delete(`/Disponibilidades/${id}`);
  }

  function updateDragPreview() {
    const r = dragRef.current;
    if (!r.active || !r.dateISO || r.startHour == null || r.currentHour == null) {
      setDragUI(null);
      return;
    }

    if (r.mode === "remove") {
      setDragUI({
        active: true,
        mode: "remove",
        dateISO: r.dateISO,
        startH: r.startHour,
        endH: r.startHour + 1,
        removeId: r.removeId,
      });
      return;
    }

    const a = Math.min(r.startHour, r.currentHour);
    const b = Math.max(r.startHour, r.currentHour) + 1;

    const startH = clamp(a, hourStart, hourEnd - 1);
    const endH = clamp(b, hourStart + 1, hourEnd);

    setDragUI({
      active: true,
      mode: "add",
      dateISO: r.dateISO,
      startH,
      endH,
      removeId: null,
    });
  }

  function beginDrag(dateISO, hour) {
    if (!isFormador || saving || loading) return;

    const existing = findBlockAt(dateISO, hour);

    dragRef.current.active = true;
    dragRef.current.dateISO = dateISO;
    dragRef.current.startHour = hour;
    dragRef.current.currentHour = hour;

    if (existing) {
      dragRef.current.mode = "remove";
      dragRef.current.removeId = existing.id;
    } else {
      dragRef.current.mode = "add";
      dragRef.current.removeId = null;
    }

    updateDragPreview();
  }

  function enterDrag(dateISO, hour) {
    if (!dragRef.current.active) return;
    if (dateISO !== dragRef.current.dateISO) return;
    dragRef.current.currentHour = hour;
    updateDragPreview();
  }

  async function endDrag() {
    if (!dragRef.current.active) return;

    const { mode, dateISO, startHour, currentHour, removeId } = dragRef.current;

    dragRef.current.active = false;

    if (!isFormador || saving || loading) {
      setDragUI(null);
      return;
    }
    if (!dateISO || startHour == null || currentHour == null) {
      setDragUI(null);
      return;
    }

    setError("");
    setInfo("");

    try {
      setSaving(true);

      if (mode === "remove" && removeId) {
        await deleteInterval(removeId);
        setDragUI(null);
        setInfo("Bloco removido.");
        await loadWeek();
        setTimeout(() => setInfo(""), 900);
        return;
      }

      const a = Math.min(startHour, currentHour);
      const b = Math.max(startHour, currentHour) + 1;

      const startH = clamp(a, hourStart, hourEnd - 1);
      const endH = clamp(b, hourStart + 1, hourEnd);

      if (endH <= startH) {
        setDragUI(null);
        return;
      }

      const existingBlocks = blocksByDay.get(dateISO) || [];
      const overlaps = existingBlocks.some((x) => !(endH <= x.startH || startH >= x.endH));
      if (overlaps) {
        setDragUI(null);
        setError("Esse intervalo sobrepõe um bloco existente. Remove o bloco primeiro ou marca noutro espaço.");
        return;
      }

      await createInterval(dateISO, startH, endH);
      setDragUI(null);
      setInfo(`Bloco criado: ${pad2(startH)}:00 → ${pad2(endH)}:00`);
      await loadWeek();
      setTimeout(() => setInfo(""), 1200);
    } catch (e) {
      setDragUI(null);
      setError(extractError(e, "Falha ao guardar disponibilidade."));
    } finally {
      setSaving(false);
    }
  }

  function goToday() {
    setWeekStart(startOfWeekMonday(new Date()));
  }

  // Render de blocos existentes + preview
  function renderBlocksForDay(dateISO) {
    const blocks = blocksByDay.get(dateISO) || [];

    const clipped = blocks
      .map((b) => {
        const topH = Math.max(b.startH, visibleStartHour);
        const botH = Math.min(b.endH, visibleEndHour);
        if (botH <= topH) return null;
        return { ...b, clipStart: topH, clipEnd: botH };
      })
      .filter(Boolean);

    const els = clipped.map((b) => {
      const top = (b.clipStart - visibleStartHour) * rowH + 6;
      const height = (b.clipEnd - b.clipStart) * rowH - 12;

      return (
        <div
          key={b.id}
          className="absolute left-2 right-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 dark:bg-emerald-500/20
                     shadow-[0_10px_30px_-20px_rgba(16,185,129,0.6)] backdrop-blur-sm"
          style={{ top, height }}
          title={`Disponível: ${pad2(b.startH)}:00 → ${pad2(b.endH)}:00`}
        >
          <div className="p-2">
            <div className="text-[12px] font-black text-emerald-900 dark:text-emerald-100 leading-tight">
              {pad2(b.startH)}:00 • Disponível
            </div>
            <div className="text-[11px] text-emerald-900/70 dark:text-emerald-200/80 mt-0.5">
              Até {pad2(b.endH)}:00
            </div>
          </div>
        </div>
      );
    });

    // preview (enquanto arrasta)
    if (dragUI?.active && dragUI.dateISO === dateISO) {
      if (dragUI.mode === "add") {
        const topH = Math.max(dragUI.startH, visibleStartHour);
        const botH = Math.min(dragUI.endH, visibleEndHour);
        if (botH > topH) {
          const top = (topH - visibleStartHour) * rowH + 6;
          const height = (botH - topH) * rowH - 12;

          els.push(
            <div
              key="__preview_add"
              className="absolute left-2 right-2 rounded-xl border border-blue-400/50 bg-blue-500/10 dark:bg-blue-500/15
                         ring-2 ring-blue-500/20 pointer-events-none"
              style={{ top, height }}
            >
              <div className="p-2">
                <div className="text-[12px] font-black text-blue-900 dark:text-blue-100 leading-tight">
                  Preview: {pad2(dragUI.startH)}:00 → {pad2(dragUI.endH)}:00
                </div>
                <div className="text-[11px] text-blue-900/70 dark:text-blue-200/80 mt-0.5">
                  Larga para gravar • ESC para cancelar
                </div>
              </div>
            </div>
          );
        }
      } else if (dragUI.mode === "remove") {
        // preview de remoção (só feedback visual)
        els.push(
          <div
            key="__preview_remove"
            className="absolute left-2 right-2 top-2 rounded-xl border border-red-400/50 bg-red-500/10 dark:bg-red-500/15
                       ring-2 ring-red-500/20 pointer-events-none"
            style={{ height: 64 }}
          >
            <div className="p-2">
              <div className="text-[12px] font-black text-red-900 dark:text-red-100 leading-tight">
                Remover bloco
              </div>
              <div className="text-[11px] text-red-900/70 dark:text-red-200/80 mt-0.5">
                Larga para apagar • ESC para cancelar
              </div>
            </div>
          </div>
        );
      }
    }

    return els;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur-xl dark:bg-gray-900/90 dark:border-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BurgerMenu />
            <HeaderIcon />
            <div>
              <h1 className="text-xl font-black text-gray-900 dark:text-gray-100">Disponibilidades</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Marca blocos com duração livre (clica e arrasta). <span className="font-semibold">ESC</span> cancela.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Btn onClick={() => setWeekStart((w) => addDays(w, -7))} disabled={loading || saving}>
              ← Semana
            </Btn>

            <PrimaryBtn onClick={goToday} disabled={loading || saving}>
              Hoje
            </PrimaryBtn>

            <Btn onClick={() => setWeekStart((w) => addDays(w, 7))} disabled={loading || saving}>
              Semana →
            </Btn>

            {/* ✅ aparece só quando estás a marcar */}
            {dragUI?.active && (
              <DangerBtn onClick={() => cancelDrag("Marcação cancelada.")} disabled={saving}>
                Cancelar marcação
              </DangerBtn>
            )}

            <Btn
              onClick={() => {
                if (dragRef.current.active) cancelDrag("Marcação cancelada.");
                navigate("/dashboard");
              }}
              className="ml-0 md:ml-2"
            >
              ← Voltar
            </Btn>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {!isFormador && (
          <div className="mb-5 bg-red-50 border border-red-200 dark:bg-red-950/25 dark:border-red-900/40 rounded-xl p-4 text-sm text-red-700 dark:text-red-200">
            Esta página é apenas para o role <b>Formador</b>. Role atual: <b>{role}</b>
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
                Bloco disponível
              </div>

              <div className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <span className="inline-block w-3 h-3 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
                Livre
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                Semana: <span className="font-semibold text-gray-900 dark:text-gray-100">{weekRange}</span>
              </div>
            </div>

            {(loading || saving) && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                {loading ? "A carregar..." : "A guardar..."}
              </div>
            )}
          </div>

          <div className="mt-4">
            <HoursPager
              page={hourPage}
              perPage={hoursPerPage}
              total={allHours.length}
              onPageChange={setHourPage}
              onPerPageChange={(n) => {
                setHoursPerPage(n);
                setHourPage(1);
              }}
              disabled={loading || saving}
            />
          </div>

          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Dica: arrasta para criar um intervalo. Se começares em cima de um bloco, ao largar apaga o bloco.{" "}
            <span className="font-semibold">ESC</span> cancela.
          </div>
        </div>

        {/* Grid */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          {/* Header row */}
          <div className="grid" style={{ gridTemplateColumns: `90px repeat(7, minmax(140px, 1fr))` }}>
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
            <div className="grid" style={{ gridTemplateColumns: `90px repeat(7, minmax(140px, 1fr))` }}>
              {/* Hour labels */}
              <div className="border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950/20">
                {visibleHours.map((h) => (
                  <div
                    key={h}
                    className="h-[56px] flex items-center justify-center text-sm text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-800"
                  >
                    {pad2(h)}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {days.map((d) => {
                const dateISO = toISODate(d);
                const colHeight = visibleHours.length * rowH;

                return (
                  <div
                    key={dateISO}
                    className="relative border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                    style={{ height: colHeight }}
                    onMouseUp={() => endDrag()}
                    onContextMenu={(e) => {
                      // ✅ botão direito cancela (super prático)
                      if (dragRef.current.active) {
                        e.preventDefault();
                        cancelDrag("Marcação cancelada (botão direito).");
                      }
                    }}
                  >
                    {/* background grid rows */}
                    {visibleHours.map((h) => (
                      <div
                        key={`${dateISO}|${h}`}
                        className={[
                          "h-[56px] border-b border-gray-200 dark:border-gray-800",
                          "hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors",
                          !isFormador || saving ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                        ].join(" ")}
                        onMouseDown={() => beginDrag(dateISO, h)}
                        onMouseEnter={() => enterDrag(dateISO, h)}
                        title="Clica e arrasta para marcar intervalo (ESC cancela)"
                      />
                    ))}

                    {/* overlay blocks + preview */}
                    {renderBlocksForDay(dateISO)}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Nota: aqui gravamos <b>intervalos</b> (ex: 09:00 → 12:00), não hora-a-hora, para não encher a base de dados.
        </div>
      </div>
    </div>
  );
}
