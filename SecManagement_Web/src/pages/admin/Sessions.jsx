// src/pages/admin/Sessions.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

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
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
            {title}
          </h3>
          <button
            onClick={onClose}
            disabled={disableClose}
            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                       hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 font-medium text-sm"
          >
            Fechar
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
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
  // Força UTC diretamente (sem depender do timezone local)
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

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={[
            "px-4 py-2.5 text-sm font-medium transition-all",
            value === o.value
              ? "bg-emerald-600 text-white"
              : "bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800",
          ].join(" ")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function AdminSessions() {
  const navigate = useNavigate();

  const [turmas, setTurmas] = useState([]);
  const [salas, setSalas] = useState([]);

  const [turmaModulos, setTurmaModulos] = useState([]);
  const [loadingTM, setLoadingTM] = useState(false);

  const [loadingBase, setLoadingBase] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);

  // --- LISTAGEM ---
  const [view, setView] = useState("turma"); // "turma" | "sala" | "formador"
  const [filterTurmaId, setFilterTurmaId] = useState("");
  const [filterSalaId, setFilterSalaId] = useState("");
  const [filterFormadorId, setFilterFormadorId] = useState("");

  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const plus7Str = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [rangeStart, setRangeStart] = useState(todayStr);
  const [rangeEnd, setRangeEnd] = useState(plus7Str);

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [search, setSearch] = useState("");

  // --- CREATE FORM (já tinhas) ---
  const [form, setForm] = useState({
    turmaId: "",
    turmaModuloId: "",
    salaId: "",
    inicioDate: "",
    inicioTime: "",
    fimDate: "",
    fimTime: "",
  });

  async function loadBase() {
    setLoadingBase(true);
    setError("");
    try {
      const [turmasRes, salasRes] = await Promise.all([
        api.get("/Turmas"),
        api.get("/Salas"),
      ]);

      const t = Array.isArray(turmasRes.data) ? turmasRes.data : [];
      const s = Array.isArray(salasRes.data) ? salasRes.data : [];

      setTurmas(t);
      setSalas(s);

      // defaults (para listagem)
      if (!filterTurmaId && t.length) setFilterTurmaId(String(t[0]?.id ?? ""));
      if (!filterSalaId && s.length) setFilterSalaId(String(s[0]?.id ?? ""));
    } catch (err) {
      setError(extractError(err, "Erro ao carregar dados."));
    } finally {
      setLoadingBase(false);
    }
  }

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

  async function loadSessions() {
    setError("");

    const startIso = isoUtcFromDate(rangeStart, false);
    const endIso = isoUtcFromDate(rangeEnd, true);
    if (!startIso || !endIso) {
      setError("Seleciona um intervalo de datas válido.");
      return;
    }

    if (new Date(endIso) < new Date(startIso)) {
      setError("A data final tem de ser igual ou posterior à data inicial.");
      return;
    }

    let url = "";
    if (view === "turma") {
      const tid = Number(filterTurmaId);
      if (!Number.isFinite(tid) || tid <= 0) {
        setError("Seleciona uma turma para listar sessões.");
        return;
      }
      url = `/Sessoes/turma/${tid}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
    } else if (view === "sala") {
      const sid = Number(filterSalaId);
      if (!Number.isFinite(sid) || sid <= 0) {
        setError("Seleciona uma sala para listar sessões.");
        return;
      }
      url = `/Sessoes/sala/${sid}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
    } else {
      const fid = Number(filterFormadorId);
      if (!Number.isFinite(fid) || fid <= 0) {
        setError("Indica um FormadorId válido para listar sessões.");
        return;
      }
      url = `/Sessoes/formador/${fid}?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
    }

    setLoadingSessions(true);
    try {
      const res = await api.get(url);
      setSessions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setSessions([]);
      setError(extractError(err, "Erro ao carregar sessões."));
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // primeira carga automática depois de ter base (turmas/salas) e defaults
  useEffect(() => {
    if (loadingBase) return;
    // carrega logo uma vez
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingBase]);

  function openCreate() {
    setError("");
    setForm({
      turmaId: "",
      turmaModuloId: "",
      salaId: "",
      inicioDate: "",
      inicioTime: "",
      fimDate: "",
      fimTime: "",
    });
    setTurmaModulos([]);
    setShowForm(true);
  }

  function closeForm(force = false) {
    if (!force && saving) return;
    setShowForm(false);
  }

  function onChange(e) {
    const { name, value } = e.target;

    if (name === "turmaId") {
      setForm((p) => ({
        ...p,
        turmaId: value,
        turmaModuloId: "",
      }));

      const tid = Number(value);
      if (Number.isFinite(tid) && tid > 0) loadTurmaModulos(tid);
      else setTurmaModulos([]);
      return;
    }

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

    return true;
  }, [form]);

  async function createSession(e) {
    e.preventDefault();
    setError("");

    const turmaId = Number(form.turmaId);
    const turmaModuloId = Number(form.turmaModuloId);
    const salaId = Number(form.salaId);

    if (!Number.isFinite(turmaId) || turmaId <= 0) return alert("Seleciona uma turma.");
    if (!Number.isFinite(turmaModuloId) || turmaModuloId <= 0) return alert("Seleciona um módulo da turma.");
    if (!Number.isFinite(salaId) || salaId <= 0) return alert("Seleciona uma sala.");

    if (!form.inicioDate || !form.inicioTime) return alert("Data e hora de início são obrigatórias.");
    if (!form.fimDate || !form.fimTime) return alert("Data e hora de fim são obrigatórias.");

    const inicioIso = dateTimeToIsoUtc(form.inicioDate, form.inicioTime);
    const fimIso = dateTimeToIsoUtc(form.fimDate, form.fimTime);

    if (!inicioIso || !fimIso) return alert("Datas/horas inválidas.");
    if (new Date(fimIso) <= new Date(inicioIso)) {
      return alert("A data/hora de fim deve ser posterior à de início.");
    }

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

      // reset
      setForm({
        turmaId: "",
        turmaModuloId: "",
        salaId: "",
        inicioDate: "",
        inicioTime: "",
        fimDate: "",
        fimTime: "",
      });
      setTurmaModulos([]);

      // refresh list
      await loadSessions();
    } catch (err) {
      console.log("POST /Sessoes FAIL", {
        status: err?.response?.status,
        data: err?.response?.data,
        payloadSent: payload,
      });
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
      return (
        turma.includes(s) ||
        mod.includes(s) ||
        formador.includes(s) ||
        sala.includes(s) ||
        id.includes(s)
      );
    });
  }, [sessions, search]);

  const listTitle = useMemo(() => {
    if (view === "turma") {
      const t = turmas.find((x) => String(x.id) === String(filterTurmaId));
      return t?.nome ? `Turma: ${t.nome}` : "Turma";
    }
    if (view === "sala") {
      const s = salas.find((x) => String(x.id) === String(filterSalaId));
      return s?.nome ? `Sala: ${s.nome}` : "Sala";
    }
    return filterFormadorId ? `FormadorId: ${filterFormadorId}` : "Formador";
  }, [view, turmas, salas, filterTurmaId, filterSalaId, filterFormadorId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-emerald-50/30 to-teal-50/20 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-1">
                Gestão de Sessões
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Agende sessões e consulte horários por Turma, Sala ou Formador
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 font-medium"
              >
                ← Voltar
              </button>

              <button
                onClick={openCreate}
                className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white
                           hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 font-medium shadow-lg shadow-emerald-500/30"
                disabled={loadingBase}
              >
                + Nova Sessão
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {error && (
          <div
            className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300
                       px-5 py-4 rounded-xl mb-6 text-sm shadow-sm"
          >
            {error}
          </div>
        )}

        {/* FILTER BAR */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg p-5 mb-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented
                value={view}
                onChange={(v) => setView(v)}
                options={[
                  { value: "turma", label: "Por Turma" },
                  { value: "sala", label: "Por Sala" },
                  { value: "formador", label: "Por Formador" },
                ]}
              />

              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">De</span>
                  <input
                    type="date"
                    value={rangeStart}
                    onChange={(e) => setRangeStart(e.target.value)}
                    className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300 font-medium">Até</span>
                  <input
                    type="date"
                    value={rangeEnd}
                    onChange={(e) => setRangeEnd(e.target.value)}
                    className="border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>

                <button
                  type="button"
                  onClick={loadSessions}
                  className="px-4 py-2.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition font-medium"
                  disabled={loadingBase || loadingSessions}
                >
                  {loadingSessions ? "A carregar..." : "Recarregar"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Selector */}
              <div className="lg:col-span-1">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
                  {view === "turma" ? "Turma" : view === "sala" ? "Sala" : "FormadorId"}
                </div>

                {view === "turma" && (
                  <select
                    value={filterTurmaId}
                    onChange={(e) => setFilterTurmaId(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    disabled={loadingBase}
                  >
                    <option value="">Seleciona uma turma...</option>
                    {turmas.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome ?? `Turma #${t.id}`}
                      </option>
                    ))}
                  </select>
                )}

                {view === "sala" && (
                  <select
                    value={filterSalaId}
                    onChange={(e) => setFilterSalaId(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    disabled={loadingBase}
                  >
                    <option value="">Seleciona uma sala...</option>
                    {salas.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome ? `${s.nome}` : `Sala #${s.id}`}
                      </option>
                    ))}
                  </select>
                )}

                {view === "formador" && (
                  <input
                    value={filterFormadorId}
                    onChange={(e) => setFilterFormadorId(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                               bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                               focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                )}

                <div className="text-[12px] text-gray-500 dark:text-gray-400 mt-2">
                  Intervalo: <b>{rangeStart}</b> → <b>{rangeEnd}</b>
                </div>
              </div>

              {/* Search */}
              <div className="lg:col-span-2">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Pesquisa</div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Pesquisar por turma, módulo, formador, sala ou id..."
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                             bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400
                             focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <div className="mt-2 text-[12px] text-gray-500 dark:text-gray-400">
                  Vista: <b>{listTitle}</b> • Resultados: <b>{sessionsFiltered.length}</b>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LISTAGEM */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Data/Hora
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Turma
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Módulo
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Formador
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Sala
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Duração
                  </th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 py-4 px-6">
                    Ações
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loadingBase || loadingSessions ? (
                  <tr>
                    <td colSpan="7" className="py-14 px-6 text-center">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                      <p className="mt-3 text-gray-500 dark:text-gray-400">
                        A carregar sessões...
                      </p>
                    </td>
                  </tr>
                ) : sessionsFiltered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-14 px-6 text-center text-gray-500 dark:text-gray-400">
                      Sem sessões para este filtro/intervalo.
                    </td>
                  </tr>
                ) : (
                  sessionsFiltered.map((s) => (
                    <tr
                      key={s.id}
                      className="hover:bg-emerald-50/40 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-200">
                        <div className="font-semibold">{toLocalDateTime(s.horarioInicio)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          até {toLocalDateTime(s.horarioFim)}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-sm text-gray-800 dark:text-gray-100">
                        {s.turmaNome || "—"}
                      </td>

                      <td className="py-4 px-6 text-sm text-gray-800 dark:text-gray-100">
                        {s.moduloNome || "—"}
                      </td>

                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-200">
                        {s.formadorNome || "—"}
                      </td>

                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-200">
                        {s.salaNome || `#${s.salaId}`}
                      </td>

                      <td className="py-4 px-6 text-sm text-gray-700 dark:text-gray-200">
                        {durationLabel(s.horarioInicio, s.horarioFim)}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          type="button"
                          onClick={() => deleteSession(s.id)}
                          className="px-3 py-2 rounded-lg text-sm font-semibold
                                     text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20
                                     hover:bg-red-100 dark:hover:bg-red-900/30 transition"
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
        </div>
      </div>

      {/* Modal Create */}
      {showForm && (
        <Modal
          title="✨ Nova Sessão"
          onClose={() => closeForm(false)}
          disableClose={saving}
        >
          <form onSubmit={createSession} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Turma */}
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Turma
              </label>
              <select
                name="turmaId"
                value={form.turmaId}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={saving}
              >
                <option value="">Seleciona uma turma...</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome ?? `Turma #${t.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* TurmaModulo */}
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Módulo da Turma (TurmaModulo)
              </label>
              <select
                name="turmaModuloId"
                value={form.turmaModuloId}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={saving || !form.turmaId || loadingTM}
              >
                <option value="">
                  {!form.turmaId
                    ? "Seleciona primeiro uma turma..."
                    : loadingTM
                    ? "A carregar módulos..."
                    : "Seleciona um módulo da turma..."}
                </option>

                {turmaModulos.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tmLabel(tm)}
                  </option>
                ))}
              </select>

              {form.turmaId && !loadingTM && turmaModulos.length === 0 && (
                <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
                  Esta turma ainda não tem módulos associados (TurmaModulos).
                </p>
              )}
            </div>

            {/* Sala */}
            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Sala
              </label>
              <select
                name="salaId"
                value={form.salaId}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={saving}
              >
                <option value="">Seleciona uma sala...</option>
                {salas.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome
                      ? `${s.nome}${s.tipo ? ` (${s.tipo}` : ""}${s.capacidade ? `, ${s.capacidade} pessoas` : ""}${s.tipo || s.capacidade ? ")" : ""}`
                      : `Sala #${s.id}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Início: Date + Time */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Data de Início
              </label>
              <input
                type="date"
                name="inicioDate"
                value={form.inicioDate}
                onChange={onChange}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Hora de Início
              </label>
              <input
                type="time"
                name="inicioTime"
                value={form.inicioTime}
                onChange={onChange}
                step="900"
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={saving}
              />
            </div>

            {/* Fim: Date + Time */}
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Data de Fim
              </label>
              <input
                type="date"
                name="fimDate"
                value={form.fimDate}
                onChange={onChange}
                min={form.inicioDate || undefined}
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={saving}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 block">
                Hora de Fim
              </label>
              <input
                type="time"
                name="fimTime"
                value={form.fimTime}
                onChange={onChange}
                step="900"
                className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3
                           bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                disabled={saving}
              />
            </div>

            {error && (
              <div
                className="md:col-span-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800
                           text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm"
              >
                {error}
              </div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => closeForm(false)}
                className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                           hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-all duration-200 font-medium"
                disabled={saving}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white
                           hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all duration-200 font-medium
                           shadow-lg shadow-emerald-500/30"
                disabled={saving || !canSubmit}
                title={!canSubmit ? "Preenche Turma, Módulo, Sala e Horários válidos." : ""}
              >
                {saving ? "A criar..." : "Criar Sessão"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
