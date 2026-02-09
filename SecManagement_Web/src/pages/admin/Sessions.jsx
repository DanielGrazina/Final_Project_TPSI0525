// src/pages/admin/Sessions.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getToken } from "../../utils/auth";

/* ------------------------ Helpers ------------------------ */

function Modal({ title, children, onClose, disableClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
      onClick={() => !disableClose && onClose()}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 border-b border-emerald-600">
          <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span className="text-2xl">{title.split(' ')[0]}</span>
            <span>{title.split(' ').slice(1).join(' ')}</span>
          </h3>
          <button
            onClick={onClose}
            disabled={disableClose}
            className="px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white
                       disabled:opacity-50 transition-all duration-200 font-medium text-sm backdrop-blur-sm"
          >
            Fechar
          </button>
        </div>
        <div className="p-6 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
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

function tmLabel(tm) {
  const modulo =
    tm?.moduloNome ??
    tm?.modulo ??
    tm?.nomeModulo ??
    tm?.moduloTitle ??
    "Módulo";

  const formador =
    tm?.formadorEmail ??
    tm?.formadorNome ??
    tm?.nomeFormador ??
    tm?.formador ??
    "";

  return formador ? `${modulo} — ${formador}` : `${modulo}`;
}

// Junta date + time e devolve ISO UTC (string)
function dateTimeToIsoUtc(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const local = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(local.getTime())) return null;
  return local.toISOString();
}

function isoUtcFromDate(dateStr, endOfDay = false) {
  if (!dateStr) return null;
  return `${dateStr}T${endOfDay ? "23:59:59" : "00:00:00"}Z`;
}

function toLocalDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function durationLabel(ini, fim) {
  const a = new Date(ini);
  const b = new Date(fim);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return "—";
  const mins = Math.max(0, Math.round((b - a) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}m`;
}

/* ---- JWT helpers (FormadorId + Role) ---- */

function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

function getClaim(jwt, key) {
  if (!jwt) return null;
  // tenta várias formas comuns
  if (jwt[key] != null) return jwt[key];
  if (jwt[`http://schemas.xmlsoap.org/ws/2005/05/identity/claims/${key}`] != null)
    return jwt[`http://schemas.xmlsoap.org/ws/2005/05/identity/claims/${key}`];
  if (jwt[`http://schemas.microsoft.com/ws/2008/06/identity/claims/${key}`] != null)
    return jwt[`http://schemas.microsoft.com/ws/2008/06/identity/claims/${key}`];

  // Role costuma vir como claim types
  if (key === "role") {
    return (
      jwt["role"] ??
      jwt["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ??
      jwt["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"] ??
      null
    );
  }

  return null;
}

/* ---------------- Calendar utilities ---------------- */

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const WEEK_DAYS_FULL = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0 dom, 1 seg...
  const diff = (day === 0 ? -6 : 1) - day; // seg como início
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins) {
  const h = String(Math.floor(mins / 60)).padStart(2, "0");
  const m = String(mins % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart);
}

// Cores vibrantes para as sessões (como na imagem)
const SESSION_COLORS = [
  { bg: 'bg-gradient-to-br from-purple-500 to-purple-600', border: 'border-purple-400', text: 'text-white', hover: 'hover:from-purple-600 hover:to-purple-700' },
  { bg: 'bg-gradient-to-br from-blue-500 to-blue-600', border: 'border-blue-400', text: 'text-white', hover: 'hover:from-blue-600 hover:to-blue-700' },
  { bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600', border: 'border-emerald-400', text: 'text-white', hover: 'hover:from-emerald-600 hover:to-emerald-700' },
  { bg: 'bg-gradient-to-br from-orange-500 to-orange-600', border: 'border-orange-400', text: 'text-white', hover: 'hover:from-orange-600 hover:to-orange-700' },
  { bg: 'bg-gradient-to-br from-pink-500 to-pink-600', border: 'border-pink-400', text: 'text-white', hover: 'hover:from-pink-600 hover:to-pink-700' },
  { bg: 'bg-gradient-to-br from-teal-500 to-teal-600', border: 'border-teal-400', text: 'text-white', hover: 'hover:from-teal-600 hover:to-teal-700' },
  { bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600', border: 'border-indigo-400', text: 'text-white', hover: 'hover:from-indigo-600 hover:to-indigo-700' },
  { bg: 'bg-gradient-to-br from-rose-500 to-rose-600', border: 'border-rose-400', text: 'text-white', hover: 'hover:from-rose-600 hover:to-rose-700' },
];

function getSessionColor(sessionId) {
  return SESSION_COLORS[sessionId % SESSION_COLORS.length];
}

/* ------------------------ Component ------------------------ */

export default function AdminSessions() {
  const navigate = useNavigate();

  const token = getToken();
  const jwt = useMemo(() => (token ? parseJwt(token) : null), [token]);

  const role = useMemo(() => String(getClaim(jwt, "role") || ""), [jwt]);
  const formadorId = useMemo(() => {
    const v = jwt?.FormadorId ?? jwt?.formadorId ?? null;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [jwt]);

  const isAdminLike = useMemo(() => ["Admin", "SuperAdmin", "Secretaria"].includes(role), [role]);
  const isCoordinatorCandidate = useMemo(() => !!formadorId, [formadorId]);

  const [turmas, setTurmas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [turmaModulos, setTurmaModulos] = useState([]);
  const [loadingTM, setLoadingTM] = useState(false);

  const [loadingBase, setLoadingBase] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [uiMode, setUiMode] = useState("calendar");

  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  const [weekAnchor, setWeekAnchor] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const [dayStart, setDayStart] = useState("08:00");
  const [dayEnd, setDayEnd] = useState("23:00");
  const [slotMins, setSlotMins] = useState(60);

  const weekStart = useMemo(() => startOfWeek(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    turmaId: "",
    turmaModuloId: "",
    salaId: "",
    inicioDate: "",
    inicioTime: "",
    fimDate: "",
    fimTime: "",
  });

  const [search, setSearch] = useState("");

  /* ------------------------ Load Base ------------------------ */

  async function loadTurmasForUser() {
    try {
      const res = await api.get("/Turmas/coordenador");
      if (Array.isArray(res.data)) return res.data;
    } catch (e) {
      // fallback
    }

    const res = await api.get("/Turmas");
    const all = Array.isArray(res.data) ? res.data : [];

    if (isAdminLike) return all;

    if (formadorId) {
      return all.filter((t) => Number(t?.coordenadorId) === Number(formadorId));
    }

    return all;
  }

  async function loadBase() {
    setLoadingBase(true);
    setError("");
    try {
      const [turmasList, salasRes] = await Promise.all([
        loadTurmasForUser(),
        api.get("/Salas"),
      ]);

      const s = Array.isArray(salasRes.data) ? salasRes.data : [];

      setTurmas(turmasList);
      setSalas(s);

      if (!selectedTurmaId && turmasList.length) {
        setSelectedTurmaId(String(turmasList[0]?.id ?? ""));
      }

      if (!isAdminLike) setUiMode("calendar");
    } catch (err) {
      setError(extractError(err, "Erro ao carregar dados base."));
    } finally {
      setLoadingBase(false);
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

  /* ------------------------ TurmaModulos ------------------------ */

  async function loadTurmaModulos(turmaId) {
    if (!turmaId) {
      setTurmaModulos([]);
      return;
    }
    setLoadingTM(true);
    setError("");
    try {
      const res = await api.get(`/Turmas/${turmaId}/modulos`);
      setTurmaModulos(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setTurmaModulos([]);
      setError(extractError(err, "Não foi possível carregar os módulos da turma."));
    } finally {
      setLoadingTM(false);
    }
  }

  useEffect(() => {
    if (!selectedTurmaId) return;
    loadTurmaModulos(Number(selectedTurmaId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTurmaId]);

  /* ------------------------ Sessions Load ------------------------ */

  async function loadWeekSessions() {
    setError("");
    const tid = Number(selectedTurmaId);
    if (!Number.isFinite(tid) || tid <= 0) {
      setSessions([]);
      return;
    }

    const startIso = isoUtcFromDate(toYmd(weekStart), false);
    const endIso = isoUtcFromDate(toYmd(addDays(weekStart, 6)), true);

    setLoadingSessions(true);
    try {
      const url = `/Sessoes/turma/${tid}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
      const res = await api.get(url);
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setSessions([]);
      setError(extractError(err, "Erro ao carregar sessões da semana."));
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    if (loadingBase) return;
    if (!selectedTurmaId) return;
    loadWeekSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingBase, selectedTurmaId, weekStart]);

  /* ------------------------ Create Flow ------------------------ */

  function openCreateWithSlot(dayDate, startTime, endTime) {
    setError("");

    const dateStr = toYmd(dayDate);

    setForm({
      turmaId: String(selectedTurmaId || ""),
      turmaModuloId: "",
      salaId: "",
      inicioDate: dateStr,
      inicioTime: startTime,
      fimDate: dateStr,
      fimTime: endTime,
    });

    setShowForm(true);
  }

  function closeForm(force = false) {
    if (!force && saving) return;
    setShowForm(false);
  }

  function onChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  }

  const canSubmit = useMemo(() => {
    const turmaId = Number(form.turmaId);
    const turmaModuloId = Number(form.turmaModuloId);
    const salaId = Number(form.salaId);

    if (!Number.isFinite(turmaId) || turmaId <= 0) return false;
    if (!Number.isFinite(turmaModuloId) || turmaModuloId <= 0) return false;
    if (!Number.isFinite(salaId) || salaId <= 0) return false;

    const i = dateTimeToIsoUtc(form.inicioDate, form.inicioTime);
    const f = dateTimeToIsoUtc(form.fimDate, form.fimTime);
    if (!i || !f) return false;
    if (new Date(f) <= new Date(i)) return false;

    const clashes = sessions.some((s) =>
      overlaps(i, f, s?.horarioInicio, s?.horarioFim)
    );
    if (clashes) return false;

    return true;
  }, [form, sessions]);

  async function createSession(e) {
    e.preventDefault();
    setError("");

    const turmaModuloId = Number(form.turmaModuloId);
    const salaId = Number(form.salaId);

    const inicioIso = dateTimeToIsoUtc(form.inicioDate, form.inicioTime);
    const fimIso = dateTimeToIsoUtc(form.fimDate, form.fimTime);

    if (!inicioIso || !fimIso) return;

    const payload = {
      TurmaModuloId: turmaModuloId,
      SalaId: salaId,
      HorarioInicio: inicioIso,
      HorarioFim: fimIso,
    };

    setSaving(true);
    try {
      await api.post("/Sessoes", payload);
      closeForm(true);
      await loadWeekSessions();
    } catch (err) {
      setError(extractError(err, "Erro ao criar sessão."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession(id) {
    if (!window.confirm(`Eliminar a sessão #${id}?`)) return;

    setError("");
    try {
      await api.delete(`/Sessoes/${id}`);
      setSessions((prev) => prev.filter((x) => Number(x?.id) !== Number(id)));
    } catch (err) {
      setError(extractError(err, "Erro ao eliminar sessão."));
    }
  }

  /* ------------------------ Filtering / Rendering ------------------------ */

  const sessionsFiltered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const list = Array.isArray(sessions) ? sessions : [];
    if (!s) return list;

    return list.filter((x) => {
      const turma = String(x?.turmaNome ?? "").toLowerCase();
      const mod = String(x?.moduloNome ?? "").toLowerCase();
      const formador = String(x?.formadorNome ?? "").toLowerCase();
      const sala = String(x?.salaNome ?? "").toLowerCase();
      const id = String(x?.id ?? "");
      return turma.includes(s) || mod.includes(s) || formador.includes(s) || sala.includes(s) || id.includes(s);
    });
  }, [sessions, search]);

  const slots = useMemo(() => {
    const start = timeToMinutes(dayStart);
    const end = timeToMinutes(dayEnd);
    const step = Math.max(15, Number(slotMins) || 60);

    const out = [];
    for (let m = start; m < end; m += step) {
      out.push({
        start: minutesToTime(m),
        end: minutesToTime(Math.min(m + step, end)),
      });
    }
    return out;
  }, [dayStart, dayEnd, slotMins]);

  function slotHasSession(dayDate, slotStart, slotEnd) {
    const startIso = dateTimeToIsoUtc(toYmd(dayDate), slotStart);
    const endIso = dateTimeToIsoUtc(toYmd(dayDate), slotEnd);
    if (!startIso || !endIso) return null;

    const found = sessionsFiltered.find((s) =>
      overlaps(startIso, endIso, s?.horarioInicio, s?.horarioFim)
    );
    return found || null;
  }

  const selectedTurmaName = useMemo(() => {
    const t = turmas.find((x) => String(x.id) === String(selectedTurmaId));
    return t?.nome ?? (selectedTurmaId ? `Turma #${selectedTurmaId}` : "—");
  }, [turmas, selectedTurmaId]);

  const isToday = (date) => sameDay(date, new Date());

  /* ------------------------ UI ------------------------ */

  return (
    <div className="min-h-screen bg-[#0a0e1a]">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
        
        .custom-scrollbar::-webkit-scrollbar { width: 10px; height: 10px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #1a1f2e; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2d3548; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3d4558; }
      `}</style>

      {/* Header */}
      <div className="bg-[#0f1419] border-b border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight mb-1">
                📅 Gestão de Sessões
              </h1>
              <p className="text-sm text-gray-400">
                Coordenador: escolhe a turma → marca aulas numa grelha semanal
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-5 py-2.5 rounded-lg border border-gray-700 text-gray-300
                           hover:bg-gray-800 transition-all duration-200 font-medium"
              >
                ← Voltar
              </button>

              {isAdminLike && (
                <button
                  type="button"
                  onClick={() => setUiMode((p) => (p === "calendar" ? "list" : "calendar"))}
                  className="px-5 py-2.5 rounded-lg border border-emerald-600
                             bg-emerald-600/10 text-emerald-400
                             hover:bg-emerald-600/20
                             transition-all duration-200 font-medium"
                >
                  {uiMode === "calendar" ? "📋 Listagem" : "📅 Calendário"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-6">
        {error && (
          <div className="bg-red-900/20 border-l-4 border-red-500 text-red-300 px-6 py-4 rounded-lg mb-6 text-sm flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Controls */}
        <div className="bg-[#0f1419] border border-gray-800 rounded-xl p-5 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 justify-between">
            <div className="flex-1">
              <div className="text-xs font-bold text-emerald-400 mb-2 uppercase tracking-wider">
                Turma
              </div>

              <select
                value={selectedTurmaId}
                onChange={(e) => setSelectedTurmaId(e.target.value)}
                className="w-full border border-gray-700 rounded-lg px-4 py-3
                           bg-[#1a1f2e] text-white
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                disabled={loadingBase}
              >
                <option value="">Seleciona uma turma...</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome ?? `Turma #${t.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 bg-[#1a1f2e] px-3 py-2 rounded-lg">
                <span className="text-xs font-bold text-gray-400">Início</span>
                <input
                  type="time"
                  value={dayStart}
                  onChange={(e) => setDayStart(e.target.value)}
                  className="border border-gray-700 rounded-lg px-2 py-1.5 bg-[#0f1419] text-white text-sm"
                />
              </div>

              <div className="flex items-center gap-2 bg-[#1a1f2e] px-3 py-2 rounded-lg">
                <span className="text-xs font-bold text-gray-400">Fim</span>
                <input
                  type="time"
                  value={dayEnd}
                  onChange={(e) => setDayEnd(e.target.value)}
                  className="border border-gray-700 rounded-lg px-2 py-1.5 bg-[#0f1419] text-white text-sm"
                />
              </div>

              <div className="flex items-center gap-2 bg-[#1a1f2e] px-3 py-2 rounded-lg">
                <span className="text-xs font-bold text-gray-400">Slot</span>
                <select
                  value={slotMins}
                  onChange={(e) => setSlotMins(Number(e.target.value))}
                  className="border border-gray-700 rounded-lg px-2 py-1.5 bg-[#0f1419] text-white text-sm"
                >
                  <option value={30}>30min</option>
                  <option value={60}>1h</option>
                  <option value={90}>1h30</option>
                </select>
              </div>

              <div className="h-8 w-px bg-gray-700"></div>

              <button
                type="button"
                onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}
                className="px-3 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition text-sm"
              >
                ← Semana
              </button>
              <button
                type="button"
                onClick={() => setWeekAnchor(new Date())}
                className="px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition text-sm"
              >
                Hoje
              </button>
              <button
                type="button"
                onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}
                className="px-3 py-2 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 transition text-sm"
              >
                Semana →
              </button>

              <button
                type="button"
                onClick={loadWeekSessions}
                className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition text-sm"
                disabled={loadingSessions || !selectedTurmaId}
              >
                {loadingSessions ? "🔄" : "Recarregar"}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-white font-medium">{selectedTurmaName}</span>
              </span>
              <span className="text-gray-600">•</span>
              <span>{toYmd(weekStart)} → {toYmd(addDays(weekStart, 6))}</span>
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Pesquisar..."
              className="w-full sm:w-[300px] border border-gray-700 rounded-lg px-4 py-2
                         bg-[#1a1f2e] text-white placeholder:text-gray-500
                         focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* CALENDAR MODE */}
        {uiMode === "calendar" && (
          <div className="bg-[#0f1419] border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-auto custom-scrollbar">
              <table className="min-w-full border-collapse">
                <thead className="bg-[#1a1f2e] border-b border-gray-800 sticky top-0 z-10">
                  <tr>
                    <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-400 py-4 px-4 w-[90px] border-r border-gray-800">
                      Hora
                    </th>
                    {weekDays.map((d, idx) => {
                      const today = isToday(d);
                      return (
                        <th
                          key={idx}
                          className={`text-center text-xs font-bold uppercase tracking-wider py-4 px-3 min-w-[140px] border-r border-gray-800 last:border-r-0
                                     ${today ? 'bg-emerald-900/20 text-emerald-400' : 'text-gray-400'}`}
                        >
                          <div className="flex flex-col items-center gap-0.5">
                            <span>{WEEK_DAYS[idx]}</span>
                            <span className="text-[10px] font-normal opacity-60">
                              {String(d.getDate()).padStart(2, '0')}/{String(d.getMonth() + 1).padStart(2, '0')}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody>
                  {slots.map((slot) => (
                    <tr 
                      key={slot.start} 
                      className="border-b border-gray-800/50 hover:bg-gray-900/20 transition-colors"
                    >
                      <td className="py-2 px-3 text-xs font-medium text-gray-400 bg-[#1a1f2e] border-r border-gray-800">
                        {slot.start}
                      </td>

                      {weekDays.map((d, idx) => {
                        const hit = slotHasSession(d, slot.start, slot.end);
                        const today = isToday(d);

                        return (
                          <td 
                            key={idx} 
                            className={`p-1 align-top border-r border-gray-800/30 last:border-r-0 ${today ? 'bg-emerald-900/5' : ''}`}
                          >
                            {hit ? (
                              <div className={`group relative rounded-lg ${getSessionColor(hit.id).bg} ${getSessionColor(hit.id).text} ${getSessionColor(hit.id).hover}
                                            p-2.5 transition-all duration-200 cursor-pointer h-full min-h-[70px] flex flex-col justify-between`}>
                                <div>
                                  <div className="text-xs font-bold mb-1 leading-tight line-clamp-2">
                                    {hit.moduloNome || "Sessão"}
                                  </div>
                                  
                                  <div className="text-[10px] opacity-90 space-y-0.5">
                                    <div className="truncate">{hit.formadorNome || "—"}</div>
                                    <div className="truncate">{hit.salaNome || `Sala #${hit.salaId}`}</div>
                                  </div>
                                </div>

                                <div className="text-[9px] opacity-75 mt-1 pt-1 border-t border-white/20">
                                  {durationLabel(hit.horarioInicio, hit.horarioFim)}
                                </div>

                                {isAdminLike && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteSession(hit.id);
                                    }}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100
                                             px-1.5 py-0.5 rounded text-[9px] font-bold
                                             bg-red-600/80 hover:bg-red-600 text-white
                                             transition-all duration-200"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                disabled={!selectedTurmaId || loadingSessions}
                                onClick={() => openCreateWithSlot(d, slot.start, slot.end)}
                                className="w-full h-full min-h-[70px] rounded-lg border border-dashed border-gray-700/50
                                         hover:border-emerald-600 hover:bg-emerald-900/10
                                         text-gray-700 hover:text-emerald-500
                                         text-xs transition-all duration-200
                                         disabled:opacity-20 disabled:cursor-not-allowed
                                         flex items-center justify-center"
                              >
                                <span className="text-base opacity-40 hover:opacity-100 transition-opacity">+</span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legenda */}
            <div className="border-t border-gray-800 px-5 py-3 bg-[#1a1f2e] flex items-center justify-between">
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-600"></div>
                  <span>Disponível</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-gray-700 border border-dashed border-gray-600"></div>
                  <span>Não definido</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {sessionsFiltered.length} sessão{sessionsFiltered.length !== 1 ? 'ões' : ''}
              </div>
            </div>
          </div>
        )}

        {/* LIST MODE */}
        {uiMode === "list" && (
          <div className="bg-[#0f1419] border border-gray-800 rounded-xl overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-[#1a1f2e] border-b border-gray-800">
                <tr>
                  <th className="text-left text-xs font-bold uppercase text-gray-400 py-4 px-6">Data/Hora</th>
                  <th className="text-left text-xs font-bold uppercase text-gray-400 py-4 px-6">Módulo</th>
                  <th className="text-left text-xs font-bold uppercase text-gray-400 py-4 px-6">Formador</th>
                  <th className="text-left text-xs font-bold uppercase text-gray-400 py-4 px-6">Sala</th>
                  <th className="text-left text-xs font-bold uppercase text-gray-400 py-4 px-6">Duração</th>
                  <th className="text-right text-xs font-bold uppercase text-gray-400 py-4 px-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {loadingSessions ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                    </td>
                  </tr>
                ) : sessionsFiltered.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-16 text-center text-gray-400">Sem sessões</td>
                  </tr>
                ) : (
                  sessionsFiltered.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-900/20 transition">
                      <td className="py-4 px-6 text-sm text-white">
                        <div className="font-bold">{toLocalDateTime(s.horarioInicio)}</div>
                        <div className="text-xs text-gray-500">até {toLocalDateTime(s.horarioFim)}</div>
                      </td>
                      <td className="py-4 px-6 text-sm font-bold text-white">{s.moduloNome || "—"}</td>
                      <td className="py-4 px-6 text-sm text-gray-300">{s.formadorNome || "—"}</td>
                      <td className="py-4 px-6 text-sm text-gray-300">{s.salaNome || `#${s.salaId}`}</td>
                      <td className="py-4 px-6 text-sm text-emerald-400">{durationLabel(s.horarioInicio, s.horarioFim)}</td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => deleteSession(s.id)}
                          className="px-3 py-1.5 rounded text-xs font-bold text-red-400 bg-red-900/20 hover:bg-red-900/30"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <Modal title="✨ Marcar Sessão" onClose={() => closeForm(false)} disableClose={saving}>
          <form onSubmit={createSession} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-sm font-bold text-gray-300 mb-2 block">Turma</label>
              <input value={selectedTurmaName} disabled className="w-full border border-gray-700 rounded-lg px-4 py-3 bg-gray-800 text-gray-400" />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-gray-300 mb-2 block">Módulo</label>
              <select
                name="turmaModuloId"
                value={form.turmaModuloId}
                onChange={onChange}
                className="w-full border border-gray-700 rounded-lg px-4 py-3 bg-[#1a1f2e] text-white"
                disabled={saving || loadingTM}
              >
                <option value="">{loadingTM ? "A carregar..." : "Seleciona..."}</option>
                {turmaModulos.map((tm) => (
                  <option key={tm.id} value={tm.id}>{tmLabel(tm)}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-bold text-gray-300 mb-2 block">Sala</label>
              <select
                name="salaId"
                value={form.salaId}
                onChange={onChange}
                className="w-full border border-gray-700 rounded-lg px-4 py-3 bg-[#1a1f2e] text-white"
                disabled={saving}
              >
                <option value="">Seleciona...</option>
                {salas.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome || `Sala #${s.id}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-300 mb-2 block">Data Início</label>
              <input type="date" name="inicioDate" value={form.inicioDate} onChange={onChange}
                className="w-full border border-gray-700 rounded-lg px-4 py-3 bg-[#1a1f2e] text-white" disabled={saving} />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-300 mb-2 block">Hora Início</label>
              <input type="time" name="inicioTime" value={form.inicioTime} onChange={onChange}
                className="w-full border border-gray-700 rounded-lg px-4 py-3 bg-[#1a1f2e] text-white" disabled={saving} />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-300 mb-2 block">Data Fim</label>
              <input type="date" name="fimDate" value={form.fimDate} onChange={onChange}
                className="w-full border border-gray-700 rounded-lg px-4 py-3 bg-[#1a1f2e] text-white" disabled={saving} />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-300 mb-2 block">Hora Fim</label>
              <input type="time" name="fimTime" value={form.fimTime} onChange={onChange}
                className="w-full border border-gray-700 rounded-lg px-4 py-3 bg-[#1a1f2e] text-white" disabled={saving} />
            </div>

            {error && (
              <div className="md:col-span-2 bg-red-900/20 border-l-4 border-red-500 text-red-300 px-4 py-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={() => closeForm(false)}
                className="px-6 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold
                           hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50"
                disabled={saving || !canSubmit}
              >
                {saving ? "A criar..." : "Marcar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}