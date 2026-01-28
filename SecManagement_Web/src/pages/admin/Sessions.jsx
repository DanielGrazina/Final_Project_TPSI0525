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

  // dateStr: "YYYY-MM-DD"
  // timeStr: "HH:mm"
  const local = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(local.getTime())) return null;

  return local.toISOString();
}

export default function AdminSessions() {
  const navigate = useNavigate();

  const [turmas, setTurmas] = useState([]);
  const [salas, setSalas] = useState([]);

  const [turmaModulos, setTurmaModulos] = useState([]);
  const [loadingTM, setLoadingTM] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);

  // 👇 Em vez de datetime-local, usamos date + time
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
    setLoading(true);
    setError("");
    try {
      const [turmasRes, salasRes] = await Promise.all([
        api.get("/Turmas"),
        api.get("/Salas"),
      ]);

      setTurmas(Array.isArray(turmasRes.data) ? turmasRes.data : []);
      setSalas(Array.isArray(salasRes.data) ? salasRes.data : []);
    } catch (err) {
      setError(extractError(err, "Erro ao carregar dados."));
    } finally {
      setLoading(false);
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

  useEffect(() => {
    loadBase();
  }, []);

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
                Agende sessões de formação com turmas, módulos e salas
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
                disabled={loading}
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

        {/* Listagem removida por agora */}
        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg p-6">
          {loading ? (
            <div className="py-10 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              <p className="mt-3 text-gray-500 dark:text-gray-400">
                A carregar dados base...
              </p>
            </div>
          ) : (
            <div className="text-gray-700 dark:text-gray-300">
              <div className="font-semibold mb-2">
                Listagem de sessões (temporariamente desativada)
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Para já: <b>Turma → Módulo → Sala → Data + Hora</b>.
              </div>
            </div>
          )}
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
                      ? `${s.nome}${s.tipo ? ` (${s.tipo}` : ""}${
                          s.capacidade ? `, ${s.capacidade} pessoas` : ""
                        }${s.tipo || s.capacidade ? ")" : ""}`
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
              <div className="md:col-span-2 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800
                              text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
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
