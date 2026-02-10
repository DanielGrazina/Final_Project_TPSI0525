// src/pages/admin/Sessions.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getToken } from "../../utils/auth";

/* ------------------------ Helpers ------------------------ */

function Modal({ title, children, onClose, disableClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => !disableClose && onClose()}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">{title}</h3>

          <button
            type="button"
            onClick={onClose}
            disabled={disableClose}
            className={[
              "px-3 py-2 rounded-lg border text-sm font-semibold transition",
              disableClose
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800",
            ].join(" ")}
          >
            Fechar
          </button>
        </div>

        <div className="p-0 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function extractError(err, fallback) {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data?.message === "string") return data.message;
  return fallback;
}

// Helpers de Data/Hora
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

function toYmd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function durationLabel(iniIso, fimIso) {
  const a = new Date(iniIso);
  const b = new Date(fimIso);
  if (isNaN(a) || isNaN(b)) return "--";
  const mins = Math.max(0, Math.round((b - a) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}` : `${m} min`;
}

/* ---- JWT helpers ---- */
function parseJwt(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split("")
        .map(function (c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/* ---------------- Calendar utilities ---------------- */

const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
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

// Cores para sessões
const SESSION_COLORS = [
  { chip: "bg-indigo-500/15 text-indigo-700 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-200 dark:border-indigo-900/50", bar: "bg-indigo-600" },
  { chip: "bg-blue-500/15 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-900/50", bar: "bg-blue-600" },
  { chip: "bg-emerald-500/15 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-900/50", bar: "bg-emerald-600" },
  { chip: "bg-purple-500/15 text-purple-700 border-purple-200 dark:bg-purple-500/20 dark:text-purple-200 dark:border-purple-900/50", bar: "bg-purple-600" },
  { chip: "bg-rose-500/15 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-900/50", bar: "bg-rose-600" },
];

function getSessionColor(sessionId) {
  return SESSION_COLORS[sessionId % SESSION_COLORS.length];
}

function fmtWeekRange(weekStart) {
  const end = addDays(weekStart, 6);
  const a = `${weekStart.getDate()}/${weekStart.getMonth() + 1}`;
  const b = `${end.getDate()}/${end.getMonth() + 1}`;
  return `${a} — ${b}`;
}

/* ------------------------ Component ------------------------ */

export default function AdminSessions() {
  const navigate = useNavigate();
  const token = getToken();
  const jwt = useMemo(() => (token ? parseJwt(token) : null), [token]);

  // Roles e IDs
  const role = jwt?.role || jwt?.Role || "User";
  const formadorId = jwt?.FormadorId || jwt?.formadorId;
  const isAdminLike = ["Admin", "SuperAdmin", "Secretaria"].includes(role);

  // Estados de Dados Base
  const [turmas, setTurmas] = useState([]);
  const [salas, setSalas] = useState([]);
  const [turmaModulos, setTurmaModulos] = useState([]);
  const [sessions, setSessions] = useState([]);

  // Estados de UI
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // Calendário
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const weekStart = useMemo(() => startOfWeek(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Wizard
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1); // 1: Time, 2: Formador, 3: Modulo, 4: Sala
  const [saving, setSaving] = useState(false);
  const [wizardError, setWizardError] = useState("");

  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [formadoresStatus, setFormadoresStatus] = useState([]);

  const [formData, setFormData] = useState({
    turmaId: "",
    inicioDate: "",
    inicioTime: "",
    fimDate: "",
    fimTime: "",
    selectedFormadorId: null,
    turmaModuloId: "",
    salaId: "",
  });

  useEffect(() => {
    if (!token) navigate("/", { replace: true });
  }, [navigate, token]);

  /* ------------------------ Loads ------------------------ */

  async function loadBase() {
    setLoadingBase(true);
    try {
      const [resSalas, resTurmasAll] = await Promise.all([api.get("/Salas"), api.get("/Turmas")]);

      setSalas(Array.isArray(resSalas.data) ? resSalas.data : []);

      let tList = Array.isArray(resTurmasAll.data) ? resTurmasAll.data : [];

      // Se for apenas formador (coordenador), filtra as suas turmas
      if (!isAdminLike && formadorId) {
        tList = tList.filter((t) => Number(t.coordenadorId) === Number(formadorId));
      }

      setTurmas(tList);

      if (tList.length > 0 && !selectedTurmaId) {
        setSelectedTurmaId(tList[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBase(false);
    }
  }

  async function loadTurmaModulos(tid) {
    if (!tid) return;
    try {
      const res = await api.get(`/Turmas/${tid}/modulos`);
      setTurmaModulos(Array.isArray(res.data) ? res.data : []);
    } catch {
      setTurmaModulos([]);
    }
  }

  async function loadSessions() {
    if (!selectedTurmaId) return;
    setLoadingSessions(true);

    const start = isoUtcFromDate(toYmd(weekStart));
    const end = isoUtcFromDate(toYmd(addDays(weekStart, 6)), true);

    try {
      const res = await api.get(`/Sessoes/turma/${selectedTurmaId}?start=${start}&end=${end}`);
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTurmaId) {
      loadTurmaModulos(selectedTurmaId);
      loadSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTurmaId, weekStart]);

  /* ------------------------ Wizard Logic ------------------------ */

  function openWizard(date, startTime, endTime) {
    const dStr = toYmd(date);
    setFormData({
      turmaId: selectedTurmaId,
      inicioDate: dStr,
      inicioTime: startTime,
      fimDate: dStr,
      fimTime: endTime,
      selectedFormadorId: null,
      turmaModuloId: "",
      salaId: "",
    });
    setStep(1);
    setShowModal(true);
    setWizardError("");
    setFormadoresStatus([]);
  }

  const availableModules = useMemo(() => {
    if (!formData.selectedFormadorId) return [];
    return turmaModulos.filter((tm) => Number(tm.formadorId) === Number(formData.selectedFormadorId));
  }, [turmaModulos, formData.selectedFormadorId]);

  async function handleNext() {
    // PASSO 1: tempo + check disponibilidade
    if (step === 1) {
      if (!formData.inicioTime || !formData.fimTime) return setWizardError("Define o horário.");
      if (formData.inicioTime >= formData.fimTime) return setWizardError("A hora de fim deve ser superior ao início.");

      setCheckingAvailability(true);
      setWizardError("");

      try {
        const startIso = dateTimeToIsoUtc(formData.inicioDate, formData.inicioTime);
        const endIso = dateTimeToIsoUtc(formData.fimDate, formData.fimTime);

        const res = await api.get(`/Sessoes/check-availability/turma/${selectedTurmaId}?start=${startIso}&end=${endIso}`);
        setFormadoresStatus(Array.isArray(res.data) ? res.data : []);
        setStep((p) => p + 1);
      } catch (err) {
        setWizardError(extractError(err, "Erro ao verificar disponibilidades."));
      } finally {
        setCheckingAvailability(false);
      }
      return;
    }

    // PASSO 2: formador
    if (step === 2) {
      if (!formData.selectedFormadorId) return setWizardError("Seleciona um formador disponível.");
    }

    // PASSO 3: módulo
    if (step === 3) {
      if (!formData.turmaModuloId) return setWizardError("Seleciona o módulo.");
    }

    setWizardError("");
    setStep((p) => p + 1);
  }

  async function handleSubmit() {
    setSaving(true);
    setWizardError("");

    const start = dateTimeToIsoUtc(formData.inicioDate, formData.inicioTime);
    const end = dateTimeToIsoUtc(formData.fimDate, formData.fimTime);

    const payload = {
      TurmaModuloId: Number(formData.turmaModuloId),
      SalaId: Number(formData.salaId),
      HorarioInicio: start,
      HorarioFim: end,
    };

    try {
      await api.post("/Sessoes", payload);
      setShowModal(false);
      loadSessions();
    } catch (err) {
      setWizardError(extractError(err, "Erro ao criar sessão."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteSession(id) {
    if (!window.confirm("Tens a certeza que queres eliminar esta sessão?")) return;
    try {
      await api.delete(`/Sessoes/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Erro ao apagar");
    }
  }

  /* ------------------------ Calendar ------------------------ */

  const slots = useMemo(() => {
    const arr = [];
    for (let h = 8; h < 23; h++) {
      arr.push({
        start: `${String(h).padStart(2, "0")}:00`,
        end: `${String(h + 1).padStart(2, "0")}:00`,
      });
    }
    return arr;
  }, []);

  function getSessionInSlot(date, slotStart) {
    const slotIso = dateTimeToIsoUtc(toYmd(date), slotStart);
    return sessions.find(
      (s) => new Date(s.horarioInicio) <= new Date(slotIso) && new Date(s.horarioFim) > new Date(new Date(slotIso).getTime() + 60000)
    );
  }

  const selectedTurmaName = turmas.find((t) => String(t.id) === String(selectedTurmaId))?.nome || "Turma";
  const weekLabel = useMemo(() => fmtWeekRange(weekStart), [weekStart]);

  const sessionsList = useMemo(() => {
    const list = Array.isArray(sessions) ? [...sessions] : [];
    list.sort((a, b) => new Date(a.horarioInicio) - new Date(b.horarioInicio));
    return list;
  }, [sessions]);

  /* ------------------------ Wizard Steps UI ------------------------ */

  const StepPill = ({ n, label, active, done }) => (
    <div
      className={[
        "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold",
        done
          ? "bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-900/50"
          : active
          ? "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-900/50"
          : "bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
      ].join(" ")}
    >
      <span
        className={[
          "w-5 h-5 rounded-full grid place-items-center text-[11px] font-black",
          done
            ? "bg-emerald-600 text-white"
            : active
            ? "bg-blue-600 text-white"
            : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
        ].join(" ")}
      >
        {n}
      </span>
      {label}
    </div>
  );

  function renderStepContent() {
    switch (step) {
      case 1:
        return (
          <div className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Define o dia e o intervalo de horário da sessão.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Dia Início</label>
                <input
                  type="date"
                  className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  value={formData.inicioDate}
                  onChange={(e) => setFormData({ ...formData, inicioDate: e.target.value, fimDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Dia Fim</label>
                <input
                  type="date"
                  className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  value={formData.fimDate}
                  onChange={(e) => setFormData({ ...formData, fimDate: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Hora Início</label>
                <input
                  type="time"
                  className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  value={formData.inicioTime}
                  onChange={(e) => setFormData({ ...formData, inicioTime: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">Hora Fim</label>
                <input
                  type="time"
                  className="w-full rounded-lg border px-3 py-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  value={formData.fimTime}
                  onChange={(e) => setFormData({ ...formData, fimTime: e.target.value })}
                />
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 p-4">
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Dica</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                No próximo passo vamos verificar automaticamente quem está disponível neste horário.
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              Seleciona um formador disponível para este intervalo.
            </p>

            {checkingAvailability ? (
              <div className="py-10 flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">A consultar disponibilidades...</div>
              </div>
            ) : (
              <div className="space-y-3">
                {formadoresStatus.map((f) => {
                  const isAvailable = !!f.disponivel;
                  const isSelected = Number(formData.selectedFormadorId) === f.formadorId;

                  return (
                    <button
                      key={f.formadorId}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => setFormData({ ...formData, selectedFormadorId: f.formadorId })}
                      className={[
                        "w-full text-left rounded-xl border p-4 transition flex items-center justify-between gap-4",
                        !isAvailable
                          ? "opacity-70 cursor-not-allowed border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20"
                          : isSelected
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                          : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className={[
                            "w-12 h-12 rounded-full grid place-items-center font-black shrink-0 border",
                            !isAvailable
                              ? "bg-red-500/10 text-red-600 border-red-200 dark:text-red-300 dark:border-red-900/40"
                              : isSelected
                              ? "bg-emerald-600 text-white border-emerald-600"
                              : "bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-900/50",
                          ].join(" ")}
                        >
                          {f.avatar ? (
                            <img src={f.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            String(f.formadorNome || "?").charAt(0)
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 dark:text-gray-100 truncate">{f.formadorNome}</div>
                          <div className="text-sm mt-0.5">
                            {!isAvailable ? (
                              <span className="text-red-600 dark:text-red-300">
                                Indisponível — {f.motivoIndisponibilidade || "Sem detalhe"}
                              </span>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-300">Disponível</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSelected ? (
                        <div className="text-emerald-600 dark:text-emerald-300 font-black">✓</div>
                      ) : (
                        <div className="text-gray-300 dark:text-gray-600 font-black">→</div>
                      )}
                    </button>
                  );
                })}

                {formadoresStatus.length === 0 && (
                  <div className="p-6 text-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                    Nenhum formador associado a esta turma (ou endpoint devolveu lista vazia).
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">Seleciona o módulo a lecionar:</p>

            <div className="space-y-3">
              {availableModules.map((tm) => {
                const isSelected = Number(formData.turmaModuloId) === tm.id;
                return (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, turmaModuloId: tm.id })}
                    className={[
                      "w-full text-left rounded-xl border p-4 transition",
                      isSelected
                        ? "border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20"
                        : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 dark:text-gray-100 truncate">{tm.moduloNome}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Carga Horária: <span className="font-semibold">{tm.horas || "--"}h</span>
                        </div>
                      </div>
                      {isSelected && <div className="text-blue-600 dark:text-blue-300 font-black">✓</div>}
                    </div>
                  </button>
                );
              })}

              {availableModules.length === 0 && (
                <div className="p-6 text-center rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400">
                  Este formador não tem módulos nesta turma.
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">Seleciona a sala:</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {salas.map((s) => {
                const isSelected = Number(formData.salaId) === s.id;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, salaId: s.id })}
                    className={[
                      "rounded-xl border p-4 text-left transition min-h-[96px]",
                      isSelected
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                        : "border-gray-200 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800",
                    ].join(" ")}
                  >
                    <div className="font-bold text-gray-900 dark:text-gray-100">{s.nome}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {s.tipo || "Geral"} • {s.capacidade} lug.
                    </div>
                    {isSelected && <div className="mt-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300">Selecionada</div>}
                  </button>
                );
              })}
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  /* ------------------------ Render ------------------------ */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">
                Sessões & Horários
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Turma: <span className="font-semibold text-gray-900 dark:text-gray-100">{selectedTurmaName}</span>{" "}
                <span className="mx-2 text-gray-300 dark:text-gray-700">•</span>
                Semana: <span className="font-semibold text-gray-900 dark:text-gray-100">{weekLabel}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Turma */}
              <div className="relative">
                <select
                  className="appearance-none bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 pr-9 text-sm
                             text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 min-w-[240px]"
                  value={selectedTurmaId}
                  onChange={(e) => setSelectedTurmaId(e.target.value)}
                  disabled={loadingBase}
                >
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nome}
                    </option>
                  ))}
                  {turmas.length === 0 && <option value="">Sem turmas atribuídas</option>}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400 text-xs">
                  ▼
                </div>
              </div>

              {/* Semana */}
              <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                <button
                  type="button"
                  onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}
                  className="px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  title="Semana anterior"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => setWeekAnchor(new Date())}
                  className="px-3 py-2 text-xs font-black text-blue-700 dark:text-blue-300 border-l border-r border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  title="Ir para esta semana"
                >
                  Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}
                  className="px-3 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  title="Semana seguinte"
                >
                  →
                </button>
              </div>

              <button
                type="button"
                onClick={loadSessions}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900
                           text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Recarregar
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold
                           hover:from-blue-700 hover:to-blue-800 transition shadow-sm"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Calendar Card */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 backdrop-blur shadow-sm overflow-hidden">
          {/* Calendar header row */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">Calendário semanal</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                Clica num “+” para criar sessão (verifica disponibilidade automaticamente).
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                sessão
              </span>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-200">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                disponível
              </span>
            </div>
          </div>

          {/* Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              {/* Days Header */}
              <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-800/50">
                <div className="p-4 text-xs font-black text-gray-600 dark:text-gray-300 uppercase tracking-wider border-r border-gray-200 dark:border-gray-800 flex items-center justify-center">
                  Hora
                </div>

                {weekDays.map((d, i) => {
                  const isToday = toYmd(d) === toYmd(new Date());
                  return (
                    <div
                      key={i}
                      className={[
                        "p-3 text-center border-r border-gray-200 dark:border-gray-800 last:border-none",
                        isToday ? "bg-blue-500/10 dark:bg-blue-500/10" : "",
                      ].join(" ")}
                    >
                      <div className={["text-sm font-black", isToday ? "text-blue-700 dark:text-blue-300" : "text-gray-800 dark:text-gray-100"].join(" ")}>
                        {WEEK_DAYS[i]}
                      </div>
                      <div className={["text-xs mt-1", isToday ? "text-blue-700/70 dark:text-blue-300/70" : "text-gray-600 dark:text-gray-400"].join(" ")}>
                        {d.getDate()}/{d.getMonth() + 1}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Slots */}
              {loadingSessions ? (
                <div className="p-16 flex flex-col items-center justify-center text-gray-600 dark:text-gray-400">
                  <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="font-semibold">A carregar sessões...</p>
                </div>
              ) : (
                slots.map((slot) => (
                  <div key={slot.start} className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-800/60">
                    {/* Time */}
                    <div className="p-2 text-xs text-gray-600 dark:text-gray-400 border-r border-gray-200 dark:border-gray-800 flex items-center justify-center font-mono bg-gray-50/50 dark:bg-gray-800/30">
                      {slot.start}
                    </div>

                    {/* Days */}
                    {weekDays.map((d, i) => {
                      const sess = getSessionInSlot(d, slot.start);
                      const isSlotToday = toYmd(d) === toYmd(new Date());
                      const c = sess ? getSessionColor(sess.id) : null;

                      return (
                        <div
                          key={i}
                          className={[
                            "border-r border-gray-200 dark:border-gray-800/60 last:border-none relative p-1 min-h-[70px] transition-colors",
                            isSlotToday ? "bg-blue-500/5 dark:bg-blue-500/5" : "bg-white/40 dark:bg-gray-900/40",
                          ].join(" ")}
                        >
                          {sess ? (
                            <div className={`w-full h-full rounded-xl border ${c.chip} p-2 text-xs shadow-sm relative group overflow-hidden`}>
                              <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${c.bar}`} />
                              <div className="pl-2">
                                <div className="font-black truncate text-[11px] leading-tight mb-0.5">
                                  {sess.moduloNome}
                                </div>
                                <div className="text-[10px] opacity-80 truncate mb-2">{sess.formadorNome}</div>

                                <div className="flex items-center justify-between text-[10px] opacity-80 border-t border-black/5 dark:border-white/10 pt-1">
                                  <span className="truncate">{sess.salaNome}</span>
                                  <span className="font-mono">
                                    {String(sess.horarioInicio || "").includes("T")
                                      ? sess.horarioInicio.split("T")[1].substring(0, 5)
                                      : ""}
                                  </span>
                                </div>
                              </div>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSession(sess.id);
                                }}
                                className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition
                                           px-2 py-1 rounded-lg text-[11px] font-black
                                           bg-black/20 hover:bg-red-600 text-white"
                                title="Eliminar sessão"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openWizard(d, slot.start, slot.end)}
                              className="w-full h-full flex items-center justify-center opacity-0 hover:opacity-100 transition"
                              title="Criar sessão"
                            >
                              <div className="w-9 h-9 rounded-full border border-blue-200 dark:border-blue-900/50 bg-blue-500/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-200 grid place-items-center font-black text-xl hover:bg-blue-600 hover:text-white hover:border-blue-600 transition">
                                +
                              </div>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* List / Table */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/60 backdrop-blur shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
            <div>
              Seções desta semana
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Lista ordenada por data/hora (mais fácil para validar rapidamente).
              </div>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total: <span className="font-black text-gray-900 dark:text-gray-100">{sessionsList.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full">
              <thead className="bg-gray-50/80 dark:bg-gray-800/50">
                <tr className="text-left text-xs uppercase tracking-wider text-gray-600 dark:text-gray-300">
                  <th className="px-6 py-3 font-black">Data</th>
                  <th className="px-6 py-3 font-black">Hora</th>
                  <th className="px-6 py-3 font-black">Módulo</th>
                  <th className="px-6 py-3 font-black">Formador</th>
                  <th className="px-6 py-3 font-black">Sala</th>
                  <th className="px-6 py-3 font-black">Duração</th>
                  <th className="px-6 py-3 font-black text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sessionsList.map((s) => {
                  const c = getSessionColor(s.id);
                  const d = new Date(s.horarioInicio);
                  const ymd = isNaN(d) ? "--" : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
                  const startT = String(s.horarioInicio || "").includes("T") ? s.horarioInicio.split("T")[1].substring(0, 5) : "--";
                  const endT = String(s.horarioFim || "").includes("T") ? s.horarioFim.split("T")[1].substring(0, 5) : "--";

                  return (
                    <tr key={s.id} className="border-t border-gray-200 dark:border-gray-800/60">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 font-semibold">{ymd}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-mono">
                        {startT}–{endT}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-black ${c.chip}`}>
                          <span className={`w-2.5 h-2.5 rounded-full ${c.bar}`} />
                          {s.moduloNome}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{s.formadorNome}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{s.salaNome}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{durationLabel(s.horarioInicio, s.horarioFim)}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => deleteSession(s.id)}
                          className="px-3 py-2 rounded-lg text-xs font-black text-white bg-red-600 hover:bg-red-700 transition"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {sessionsList.length === 0 && !loadingSessions && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-600 dark:text-gray-400">
                      Sem sessões nesta semana.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* WIZARD MODAL */}
      {showModal && (
        <Modal title={`Nova Sessão — ${selectedTurmaName}`} onClose={() => setShowModal(false)} disableClose={saving}>
          <div className="px-6 py-6">
            {/* Steps */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <StepPill n={1} label="Tempo" active={step === 1} done={step > 1} />
              <StepPill n={2} label="Formador" active={step === 2} done={step > 2} />
              <StepPill n={3} label="Módulo" active={step === 3} done={step > 3} />
              <StepPill n={4} label="Sala" active={step === 4} done={false} />
            </div>

            {/* Error */}
            {wizardError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm font-semibold dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                {wizardError}
              </div>
            )}

            {/* Step Content */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
              {renderStepContent()}

              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep((p) => Math.max(1, p - 1))}
                  disabled={step === 1 || saving || checkingAvailability}
                  className={[
                    "px-4 py-2 rounded-lg border text-sm font-semibold transition",
                    step === 1 || saving || checkingAvailability
                      ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600 dark:border-gray-700"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 dark:bg-gray-900 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800",
                  ].join(" ")}
                >
                  Voltar
                </button>

                {step < 4 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={saving || checkingAvailability}
                    className={[
                      "px-5 py-2 rounded-lg text-sm font-black text-white transition shadow-sm",
                      saving || checkingAvailability ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700",
                    ].join(" ")}
                  >
                    {checkingAvailability ? "A verificar..." : "Seguinte"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={saving || !formData.salaId}
                    className={[
                      "px-5 py-2 rounded-lg text-sm font-black text-white transition shadow-sm",
                      saving || !formData.salaId ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700",
                    ].join(" ")}
                  >
                    {saving ? "A criar..." : "Criar sessão"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
