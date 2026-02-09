// src/pages/admin/Sessions.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { getToken } from "../../utils/auth";

/* ------------------------ Helpers ------------------------ */

function Modal({ title, children, onClose, disableClose }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
      onClick={() => !disableClose && onClose()}
    >
      <div
        className="w-full max-w-2xl bg-[#0f1419] rounded-2xl shadow-2xl border border-gray-800 overflow-hidden animate-slideUp flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-[#1a1f2e]">
          <h3 className="text-lg font-bold text-white tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            disabled={disableClose}
            className="text-gray-400 hover:text-white transition-colors text-xl font-bold px-2"
          >
            ✕
          </button>
        </div>
        <div className="p-0 overflow-y-auto flex-1 custom-scrollbar relative">
          {children}
        </div>
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
    if(isNaN(a) || isNaN(b)) return "--";
    const mins = Math.max(0, Math.round((b - a) / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}` : `${m} min`;
}

/* ---- JWT helpers ---- */
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
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
  { bg: 'bg-indigo-600', border: 'border-indigo-400' },
  { bg: 'bg-blue-600', border: 'border-blue-400' },
  { bg: 'bg-emerald-600', border: 'border-emerald-400' },
  { bg: 'bg-purple-600', border: 'border-purple-400' },
  { bg: 'bg-rose-600', border: 'border-rose-400' },
];

function getSessionColor(sessionId) {
  return SESSION_COLORS[sessionId % SESSION_COLORS.length];
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
  const [turmaModulos, setTurmaModulos] = useState([]); // Lista crua para referência
  const [sessions, setSessions] = useState([]);

  // Estados de UI
  const [selectedTurmaId, setSelectedTurmaId] = useState("");
  const [loadingBase, setLoadingBase] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);
  
  // Calendário
  const [weekAnchor, setWeekAnchor] = useState(new Date());
  const weekStart = useMemo(() => startOfWeek(weekAnchor), [weekAnchor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // --- WIZARD STATES ---
  const [showModal, setShowModal] = useState(false);
  const [step, setStep] = useState(1); // 1: Time, 2: Formador, 3: Modulo, 4: Sala
  const [saving, setSaving] = useState(false);
  const [wizardError, setWizardError] = useState("");
  
  // Estado para Disponibilidade (NOVO)
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [formadoresStatus, setFormadoresStatus] = useState([]); // Vem do endpoint novo

  // Dados do formulário
  const [formData, setFormData] = useState({
    turmaId: "",
    inicioDate: "",
    inicioTime: "",
    fimDate: "",
    fimTime: "",
    selectedFormadorId: null,
    turmaModuloId: "",
    salaId: ""
  });

  /* ------------------------ Loads ------------------------ */

  async function loadBase() {
    setLoadingBase(true);
    try {
      const [resSalas, resTurmasAll] = await Promise.all([
        api.get("/Salas"),
        api.get("/Turmas")
      ]);

      setSalas(Array.isArray(resSalas.data) ? resSalas.data : []);

      let tList = Array.isArray(resTurmasAll.data) ? resTurmasAll.data : [];
      
      // Se for apenas formador (coordenador), filtra as suas turmas
      if (!isAdminLike && formadorId) {
         // Se tiveres endpoint /Turmas/coordenador usa-o, senão filtra no front:
         tList = tList.filter(t => Number(t.coordenadorId) === Number(formadorId));
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

  // Effects
  useEffect(() => { loadBase(); }, []);
  
  useEffect(() => { 
    if (selectedTurmaId) {
        loadTurmaModulos(selectedTurmaId);
        loadSessions();
    }
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
        salaId: ""
    });
    setStep(1);
    setShowModal(true);
    setWizardError("");
    setFormadoresStatus([]);
  }

  // Filtrar Módulos pelo Formador selecionado
  const availableModules = useMemo(() => {
    if (!formData.selectedFormadorId) return [];
    return turmaModulos.filter(tm => Number(tm.formadorId) === Number(formData.selectedFormadorId));
  }, [turmaModulos, formData.selectedFormadorId]);

  async function handleNext() {
    // --- VALIDAÇÃO PASSO 1 (TEMPO) ---
    if (step === 1) {
        if (!formData.inicioTime || !formData.fimTime) return setWizardError("Define o horário.");
        if (formData.inicioTime >= formData.fimTime) return setWizardError("A hora de fim deve ser superior ao início.");
        
        // Verificar Disponibilidade no Backend
        setCheckingAvailability(true);
        setWizardError("");
        try {
            const startIso = dateTimeToIsoUtc(formData.inicioDate, formData.inicioTime);
            const endIso = dateTimeToIsoUtc(formData.fimDate, formData.fimTime);
            
            // Endpoint que criámos no backend
            const res = await api.get(`/Sessoes/check-availability/turma/${selectedTurmaId}?start=${startIso}&end=${endIso}`);
            
            setFormadoresStatus(res.data);
            setStep(p => p + 1); // Avança
        } catch (err) {
            setWizardError(extractError(err, "Erro ao verificar disponibilidades."));
        } finally {
            setCheckingAvailability(false);
        }
        return; 
    }
    
    // --- VALIDAÇÃO PASSO 2 (FORMADOR) ---
    if (step === 2) {
        if (!formData.selectedFormadorId) return setWizardError("Seleciona um formador disponível.");
    }

    // --- VALIDAÇÃO PASSO 3 (MÓDULO) ---
    if (step === 3) {
        if (!formData.turmaModuloId) return setWizardError("Seleciona o módulo.");
    }

    setWizardError("");
    setStep(p => p + 1);
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
        HorarioFim: end
    };

    try {
        await api.post("/Sessoes", payload);
        setShowModal(false);
        loadSessions(); // Recarregar calendário
    } catch (err) {
        setWizardError(extractError(err, "Erro ao criar sessão."));
    } finally {
        setSaving(false);
    }
  }

  async function deleteSession(id) {
    if(!window.confirm("Tens a certeza que queres eliminar esta sessão?")) return;
    try {
        await api.delete(`/Sessoes/${id}`);
        setSessions(prev => prev.filter(s => s.id !== id));
    } catch (e) {
        alert("Erro ao apagar");
    }
  }

  /* ------------------------ Render Steps ------------------------ */

  function renderStepContent() {
    switch (step) {
        case 1: // TEMPO
            return (
                <div className="space-y-6 pt-4">
                    <p className="text-gray-400 text-sm">Define o dia e o intervalo de horário da sessão.</p>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dia Início</label>
                            <input type="date" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                                value={formData.inicioDate}
                                onChange={e => setFormData({...formData, inicioDate: e.target.value, fimDate: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dia Fim</label>
                            <input type="date" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                                value={formData.fimDate}
                                onChange={e => setFormData({...formData, fimDate: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora Início</label>
                            <input type="time" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                                value={formData.inicioTime}
                                onChange={e => setFormData({...formData, inicioTime: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora Fim</label>
                            <input type="time" className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white focus:border-emerald-500 outline-none"
                                value={formData.fimTime}
                                onChange={e => setFormData({...formData, fimTime: e.target.value})} 
                            />
                        </div>
                    </div>
                </div>
            );

        case 2: // FORMADORES (COM DISPONIBILIDADE)
            return (
                <div className="pt-2">
                    <p className="text-gray-400 text-sm mb-4">A verificar quem está disponível neste horário...</p>
                    
                    {checkingAvailability ? (
                        <div className="flex flex-col items-center justify-center py-12">
                             <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                             <span className="text-emerald-500 animate-pulse">A consultar base de dados...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {formadoresStatus.map(f => {
                                const isAvailable = f.disponivel;
                                const isSelected = Number(formData.selectedFormadorId) === f.formadorId;

                                return (
                                    <button
                                        key={f.formadorId}
                                        disabled={!isAvailable}
                                        onClick={() => setFormData({...formData, selectedFormadorId: f.formadorId})}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left group
                                            ${!isAvailable 
                                                ? "bg-red-900/10 border-red-900/30 opacity-70 cursor-not-allowed" 
                                                : isSelected
                                                    ? "bg-emerald-900/20 border-emerald-500 ring-1 ring-emerald-500"
                                                    : "bg-gray-800/40 border-gray-700 hover:bg-gray-800 hover:border-gray-500 cursor-pointer"
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-colors shrink-0
                                                ${!isAvailable 
                                                    ? "bg-red-900/30 text-red-400" 
                                                    : "bg-gray-700 text-gray-300 group-hover:bg-emerald-600 group-hover:text-white"}`}>
                                                {f.avatar ? <img src={f.avatar} className="w-full h-full rounded-full object-cover"/> : f.formadorNome.charAt(0)}
                                            </div>
                                            <div>
                                                <div className={`font-bold text-lg ${!isAvailable ? "text-gray-400" : "text-white"}`}>
                                                    {f.formadorNome}
                                                </div>
                                                <div className="text-sm mt-0.5">
                                                    {!isAvailable 
                                                        ? <span className="text-red-400 flex items-center gap-1">⛔ {f.motivoIndisponibilidade}</span> 
                                                        : <span className="text-emerald-400 flex items-center gap-1">✅ Disponível</span>}
                                                </div>
                                            </div>
                                        </div>
                                        {isSelected && <div className="text-emerald-500 text-2xl">✓</div>}
                                    </button>
                                );
                            })}
                            
                            {formadoresStatus.length === 0 && (
                                 <div className="p-8 text-center text-gray-500 border border-dashed border-gray-700 rounded-xl">
                                    Nenhum formador associado a esta turma.
                                 </div>
                            )}
                        </div>
                    )}
                </div>
            );

        case 3: // MÓDULOS
            return (
                <div className="pt-2">
                    <p className="text-gray-400 text-sm mb-4">Seleciona o módulo a lecionar:</p>
                    <div className="space-y-3">
                        {availableModules.map(tm => {
                            const isSelected = Number(formData.turmaModuloId) === tm.id;
                            return (
                                <button
                                    key={tm.id}
                                    onClick={() => setFormData({...formData, turmaModuloId: tm.id})}
                                    className={`w-full text-left p-4 rounded-xl border transition-all
                                        ${isSelected 
                                            ? "bg-blue-900/20 border-blue-500 ring-1 ring-blue-500" 
                                            : "bg-gray-800/40 border-gray-700 hover:bg-gray-800 hover:border-gray-500"}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className={`font-bold text-lg ${isSelected ? "text-blue-400" : "text-gray-200"}`}>
                                            {tm.moduloNome || tm.nomeModulo}
                                        </div>
                                        {isSelected && <div className="text-blue-500 text-xl">✓</div>}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        Carga Horária Total: {tm.cargaHorariaModulo || "--"}h
                                    </div>
                                </button>
                            );
                        })}
                        {availableModules.length === 0 && (
                            <div className="p-4 text-center text-gray-500">
                                Este formador não tem módulos nesta turma.
                            </div>
                        )}
                    </div>
                </div>
            );

        case 4: // SALA
            return (
                <div className="pt-2">
                    <p className="text-gray-400 text-sm mb-4">Seleciona a sala:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                        {salas.map(s => {
                            const isSelected = Number(formData.salaId) === s.id;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => setFormData({...formData, salaId: s.id})}
                                    className={`p-4 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[100px]
                                        ${isSelected 
                                            ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-900/20" 
                                            : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500 hover:bg-gray-700"}`}
                                >
                                    <div className="font-bold text-lg">{s.nome}</div>
                                    <div className={`text-xs mt-1 ${isSelected ? "text-emerald-100" : "text-gray-500"}`}>
                                        {s.tipo || "Geral"} • {s.capacidade} lug.
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            );
        default: return null;
    }
  }

  /* ------------------------ Main Render ------------------------ */

  const slots = useMemo(() => {
    const arr = [];
    for(let h=8; h<23; h++) {
        arr.push({ start: `${String(h).padStart(2,'0')}:00`, end: `${String(h+1).padStart(2,'0')}:00` });
    }
    return arr;
  }, []);

  function getSessionInSlot(date, slotStart) {
    const slotIso = dateTimeToIsoUtc(toYmd(date), slotStart);
    // Margem de tolerância de 1 min para visualização
    return sessions.find(s => 
        new Date(s.horarioInicio) <= new Date(slotIso) && 
        new Date(s.horarioFim) > new Date(new Date(slotIso).getTime() + 60000)
    );
  }

  const selectedTurmaName = turmas.find(t => String(t.id) === String(selectedTurmaId))?.nome || "Turma";

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-gray-100 font-sans selection:bg-emerald-500/30">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
      `}</style>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-[#0f1419]/90 backdrop-blur border-b border-gray-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-white">
                <span className="text-2xl">📅</span> Gestão de Horários
                {loadingBase && <span className="text-xs text-emerald-500 animate-pulse ml-2">A carregar...</span>}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
                Coordenador: <span className="text-gray-300">{jwt?.unique_name || "Utilizador"}</span>
            </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            {/* Seletor de Turma */}
            <div className="relative">
                <select 
                    className="appearance-none bg-[#1a1f2e] border border-gray-700 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-emerald-500 outline-none text-white min-w-[200px]"
                    value={selectedTurmaId}
                    onChange={e => setSelectedTurmaId(e.target.value)}
                    disabled={loadingBase}
                >
                    {turmas.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                    {turmas.length === 0 && <option value="">Sem turmas atribuídas</option>}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
            </div>

            {/* Controles de Semana */}
            <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                <button onClick={() => setWeekAnchor(addDays(weekAnchor, -7))} className="px-3 py-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition">←</button>
                <button onClick={() => setWeekAnchor(new Date())} className="px-3 py-1 text-xs font-bold hover:bg-gray-700 rounded text-gray-300 hover:text-white transition border-l border-r border-gray-700 mx-1">Hoje</button>
                <button onClick={() => setWeekAnchor(addDays(weekAnchor, 7))} className="px-3 py-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition">→</button>
            </div>

            <button onClick={() => navigate("/dashboard")} className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 text-sm text-gray-300 transition">
                Sair
            </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-6 overflow-x-auto">
        <div className="min-w-[900px] border border-gray-800 rounded-2xl bg-[#0f1419] overflow-hidden shadow-2xl">
            {/* Header Days */}
            <div className="grid grid-cols-8 border-b border-gray-800 bg-[#161b26]">
                <div className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-800 flex items-center justify-center">Hora</div>
                {weekDays.map((d, i) => {
                    const isToday = toYmd(d) === toYmd(new Date());
                    return (
                        <div key={i} className={`p-3 text-center border-r border-gray-800 last:border-none ${isToday ? 'bg-emerald-500/5' : ''}`}>
                            <div className={`text-sm font-bold ${isToday ? 'text-emerald-400' : 'text-gray-300'}`}>{WEEK_DAYS[i]}</div>
                            <div className={`text-xs mt-1 ${isToday ? 'text-emerald-500/70' : 'text-gray-500'}`}>{d.getDate()}/{d.getMonth()+1}</div>
                        </div>
                    );
                })}
            </div>

            {/* Slots */}
            {loadingSessions ? (
                <div className="p-20 flex flex-col items-center justify-center text-gray-500">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p>A carregar calendário...</p>
                </div>
            ) : (
                slots.map((slot) => (
                    <div key={slot.start} className="grid grid-cols-8 border-b border-gray-800/50 hover:bg-gray-900/30 transition-colors min-h-[80px]">
                        {/* Time Label */}
                        <div className="p-2 text-xs text-gray-600 border-r border-gray-800 flex items-center justify-center font-mono bg-[#11161f]">
                            {slot.start}
                        </div>
                        
                        {/* Days Columns */}
                        {weekDays.map((d, i) => {
                            const sess = getSessionInSlot(d, slot.start);
                            const isSlotToday = toYmd(d) === toYmd(new Date());

                            return (
                                <div key={i} className={`border-r border-gray-800/50 last:border-none relative p-1 transition-colors ${isSlotToday ? 'bg-emerald-500/5' : ''}`}>
                                    {sess ? (
                                        <div className={`w-full h-full rounded-lg ${getSessionColor(sess.id).bg} p-2 text-xs shadow-lg relative group overflow-hidden border border-white/10`}>
                                            <div className="font-bold truncate text-white text-[11px] leading-tight mb-0.5">{sess.moduloNome}</div>
                                            <div className="text-[10px] text-white/80 truncate mb-2">{sess.formadorNome}</div>
                                            
                                            <div className="absolute bottom-1.5 left-2 right-2 flex justify-between items-end text-[9px] text-white/70 border-t border-white/20 pt-1">
                                                <span>{sess.salaNome}</span>
                                                <span>{sess.horarioInicio.split('T')[1].substring(0,5)}</span>
                                            </div>
                                            
                                            {/* Delete Button */}
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); deleteSession(sess.id); }}
                                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/40 hover:bg-red-600 rounded p-1 text-white transition-all transform scale-90 group-hover:scale-100"
                                                title="Eliminar sessão"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => openWizard(d, slot.start, slot.end)}
                                            className="w-full h-full opacity-0 hover:opacity-100 flex items-center justify-center group"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xl group-hover:bg-emerald-500 group-hover:text-white transition-all shadow-lg transform scale-0 group-hover:scale-100">
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

      {/* WIZARD MODAL */}
      {showModal && (
        <Modal title={`Nova Sessão - ${selectedTurmaName}`} onClose={() => setShowModal(false)} disableClose={saving}>
            <div className="px-6 pb-6 pt-2 h-full flex flex-col">
                {/* Steps Indicator */}
                <div className="flex items-center justify-between mb-8 px-4">
                    {[1,2,3,4].map(s => (
                        <div key={s} className="flex items-center relative z-10">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                                ${step === s ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110' : 
                                  step > s ? 'bg-emerald-900/30 border-emerald-600 text-emerald-500' : 'bg-[#1a1f2e] border-gray-700 text-gray-500'}`}>
                                {step > s ? '✓' : s}
                            </div>
                            {/* Linha de conexão */}
                            {s < 4 && (
                                <div className={`absolute left-10 w-[calc(100vw/8)] sm:w-24 h-0.5 -z-10 
                                    ${step > s ? 'bg-emerald-800' : 'bg-gray-800'}`} 
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-[300px]">
                    {renderStepContent()}
                </div>

                {/* Error Message */}
                {wizardError && (
                    <div className="mt-4 p-3 bg-red-500/10 text-red-300 text-sm rounded-lg border border-red-500/20 flex items-center gap-2 animate-pulse">
                        ⚠️ {wizardError}
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-800">
                    <button 
                        onClick={() => step === 1 ? setShowModal(false) : setStep(s => s - 1)}
                        disabled={saving}
                        className="px-6 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition font-medium text-sm"
                    >
                        {step === 1 ? "Cancelar" : "← Voltar"}
                    </button>
                    
                    {step < 4 ? (
                        <button 
                            onClick={handleNext}
                            disabled={checkingAvailability}
                            className="px-8 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-lg shadow-emerald-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {checkingAvailability ? "A verificar..." : "Continuar →"}
                        </button>
                    ) : (
                        <button 
                            onClick={handleSubmit}
                            disabled={!formData.salaId || saving}
                            className="px-8 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold transition shadow-lg disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    A criar...
                                </>
                            ) : "Confirmar Marcação ✅"}
                        </button>
                    )}
                </div>
            </div>
        </Modal>
      )}
    </div>
  );
}