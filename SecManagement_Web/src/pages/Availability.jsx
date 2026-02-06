// src/pages/Availability.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { getToken, getUserRoleFromToken } from "../utils/auth";

/* ---------------- JWT helpers (igual ao Profiles) ---------------- */

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

  const extra = ["unique_name", "sid"];
  for (const k of extra) {
    const v = p[k];
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }

  return null;
}

/* ---------------- Date helpers ---------------- */

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
  const wd = d.toLocaleDateString("pt-PT", { weekday: "short" }); // "seg.", "ter.", etc
  return wd.charAt(0).toUpperCase() + wd.slice(1);
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

  // Drag select state
  const dragRef = useRef({
    active: false,
    mode: "add", // "add" | "remove"
    visited: new Set(),
  });

  const weekKeySet = useMemo(() => {
    // para limpar rapidamente slots fora da semana visível (opcional)
    const set = new Set();
    for (const d of days) {
      const iso = toISODate(d);
      for (const h of hours) set.add(`${iso}|${h}`);
    }
    return set;
  }, [days, hours]);

  async function resolveFormadorId() {
    // precisamos do ID do Formador (não do userId)
    // usamos Profiles/formador/{userId} e apanhamos "id"
    if (!token) throw new Error("Sem token.");
    if (!myUserId) throw new Error("Não consegui ler o teu UserId do token.");

    const r = await api.get(`/Profiles/formador/${myUserId}`);
    const fid = r?.data?.id;
    const uid = r?.data?.userId;

    // fid costuma ser o ID do formador na BD
    if (!Number.isFinite(Number(fid))) {
      // fallback: se por acaso o controller Disponibilidades estiver a usar userId em vez de formadorId
      if (Number.isFinite(Number(uid))) return Number(uid);
      throw new Error("Não encontrei o FormadorId no /Profiles/formador/{userId} (campo 'id').");
    }

    return Number(fid);
  }

  async function loadWeek() {
    setError("");
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
        
        // --- CORREÇÃO AQUI ---
        // O Backend envia "dataInicio" (DateTime ISO). Temos de extrair o dia e a hora.
        let dataISO = null;
        let hour = null;

        if (item.dataInicio) {
            const d = new Date(item.dataInicio);
            dataISO = toISODate(d); // "2026-02-09"
            hour = d.getHours();    // Extrai a hora (ex: 9)
        } else {
            // Fallback para o código antigo (caso haja dados legacy)
            const rawDate = item?.data || item?.dia || item?.date;
            const rawTime = item?.horaInicio || item?.inicio || item?.startTime;
            if (rawDate && rawTime) {
                const d = new Date(rawDate);
                dataISO = toISODate(d);
                hour = Number(safeStr(rawTime).slice(0, 2));
            }
        }

        // Se não conseguimos determinar data ou hora, ignora
        if (!dataISO || hour === null || isNaN(hour)) continue;

        const key = `${dataISO}|${hour}`;

        // Só mostramos a semana visível
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

    if (!fid) {
      console.error("Erro: ID de Formador não encontrado.");
      return;
    }

    const isoDate = toISODate(dateObj); 
    const dataInicio = `${isoDate}T${pad2(hour)}:00:00`; 
    const dataFim = `${isoDate}T${pad2(hour + 1)}:00:00`;

    // Agora enviamos o entidadeId (que é igual ao formadorId neste caso)
    const dto = {
      entidadeId: fid,       // <--- CAMPO NOVO
      tipoEntidade: "Formador",
      formadorId: fid,
      salaId: null,
      dataInicio: dataInicio,
      dataFim: dataFim,
      disponivel: true
    };

    console.log("JSON enviado:", JSON.stringify(dto));

    const res = await api.post("/Disponibilidades", dto);
    return res?.data;
  }

  async function deleteSlot(id) {
    await api.delete(`/Disponibilidades/${id}`);
  }

  async function toggleOne(dateObj, hour) {
    if (!isFormador) return;

    const key = cellKey(dateObj, hour);
    const existing = slots.get(key);

    setError("");
    setSaving(true);

    try {
      if (existing?.id) {
        await deleteSlot(existing.id);
        setSlots((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
      } else {
        const created = await createSlot(dateObj, hour);
        // se o backend não devolver o objeto, fazemos refresh
        if (!created || !created.id) {
          await loadWeek();
        } else {
          setSlots((prev) => {
            const next = new Map(prev);
            next.set(key, created);
            return next;
          });
        }
      }
    } catch (e) {
      setError(extractError(e, "Falha ao guardar disponibilidade."));
    } finally {
      setSaving(false);
    }
  }

  function beginDrag(dateObj, hour) {
    if (!isFormador || saving) return;

    const key = cellKey(dateObj, hour);
    const currently = isAvailable(key);

    dragRef.current.active = true;
    dragRef.current.mode = currently ? "remove" : "add";
    dragRef.current.visited = new Set([key]);

    // aplica no primeiro clique já
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

    // modo add: só cria se não existir
    // modo remove: só apaga se existir
    if (dragRef.current.mode === "add") {
      if (existing) return;

      setError("");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-950 to-gray-900 text-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-gray-950/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">Disponibilidades</h1>
            <p className="text-sm text-gray-300">
              Marca os blocos horários em que estás disponível. (Clica e arrasta para marcar vários)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, -7))}
              className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              disabled={loading || saving}
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={goToday}
              className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              disabled={loading || saving}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setWeekStart((w) => addDays(w, 7))}
              className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              disabled={loading || saving}
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
        {!isFormador && (
          <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-200">
            Esta página é apenas para o role <b>Formador</b>. O teu role atual é: <b>{role}</b>
          </div>
        )}

        {error && (
          <div className="mb-5 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Legend */}
        <div className="mb-4 flex items-center gap-4 text-sm text-gray-300">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-green-500" />
            Disponível
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded bg-white/10 border border-white/10" />
            Não definido
          </div>

          {(loading || saving) && (
            <div className="ml-auto flex items-center gap-2 text-xs text-gray-300">
              <span className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              {loading ? "A carregar..." : "A guardar..."}
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
            <div
              className="select-none"
              onMouseLeave={() => {
                // não terminamos drag aqui (só no mouseup), mas evita “saltos”
              }}
            >
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
                    const available = isAvailable(key);

                    return (
                      <div
                        key={key}
                        className={[
                          "relative border-r border-white/10 h-12 cursor-pointer",
                          "transition-colors",
                          available ? "bg-green-500/20" : "bg-white/0 hover:bg-white/5",
                          !isFormador || saving ? "opacity-60 cursor-not-allowed" : "",
                        ].join(" ")}
                        onMouseDown={() => beginDrag(d, h)}
                        onMouseEnter={() => enterDrag(d, h)}
                        onMouseUp={() => endDrag()}
                        title={available ? "Disponível (clicar para remover)" : "Não definido (clicar para marcar disponível)"}
                      >
                        {available && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="px-2 py-1 rounded-full bg-green-500 text-white text-[11px] font-bold">
                              Available
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

        <div className="mt-4 text-xs text-gray-400">
          Dica: clica e arrasta para marcar vários blocos. Se começares num bloco já marcado, o arrasto apaga.
        </div>
      </div>
    </div>
  );
}
