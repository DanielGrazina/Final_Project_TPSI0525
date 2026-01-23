import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

function Modal({ title, children, onClose, disabled }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={() => !disabled && onClose()}
    >
      <div
        className="w-full max-w-3xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b dark:border-gray-800">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            disabled={disabled}
            className="px-3 py-1 rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-60
                       dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Fechar
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function safeStr(x) {
  return (x ?? "").toString();
}

function toDateLike(x) {
  if (!x) return "";
  return String(x).slice(0, 10);
}

export default function AdminEvaluations() {
  const navigate = useNavigate();

  // se o teu controller tiver outro nome, muda só isto:
  const BASE = "/Avaliacoes";

  const [avaliacoes, setAvaliacoes] = useState([]);
  const [turmas, setTurmas] = useState([]);

  // selects dependentes da turma (usam endpoints que TU já tens no TurmasController)
  const [inscricoes, setInscricoes] = useState([]);
  const [turmaModulos, setTurmaModulos] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [turmaFilter, setTurmaFilter] = useState("Todos");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // Form (tabela Avaliacoes)
  const [form, setForm] = useState({
    turmaId: "",
    inscricaoId: "",
    turmaModuloId: "",
    avaliacao: "", // decimal
    observacoes: "",
  });

  async function loadAll() {
    setLoading(true);
    setError("");

    try {
      const [aRes, tRes] = await Promise.all([
        api.get(BASE),
        api.get("/Turmas"),
      ]);

      setAvaliacoes(Array.isArray(aRes.data) ? aRes.data : []);
      setTurmas(Array.isArray(tRes.data) ? tRes.data : []);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data || "Falha ao carregar dados.";
      setError(typeof msg === "string" ? msg : "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function loadTurmaDependencias(turmaId) {
    setInscricoes([]);
    setTurmaModulos([]);

    if (!turmaId) return;

    try {
      const [iRes, mRes] = await Promise.all([
        api.get(`/Turmas/${turmaId}/alunos`),
        api.get(`/Turmas/${turmaId}/modulos`),
      ]);

      setInscricoes(Array.isArray(iRes.data) ? iRes.data : []);
      setTurmaModulos(Array.isArray(mRes.data) ? mRes.data : []);
    } catch (err) {
      // não rebenta o formulário; só mostra erro
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Falha a carregar alunos/módulos da turma.";
      setError(typeof msg === "string" ? msg : "Falha a carregar alunos/módulos da turma.");
    }
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();

    return avaliacoes.filter((a) => {
      const turmaNome =
        (turmas.find((t) => t.id === a.turmaId)?.nome ?? a.turmaNome ?? "").toLowerCase();

      // tentativas “safe” de mostrar algo humano (depende do InscricaoDto que tens)
      const alunoNome =
        (a.formandoNome ?? a.alunoNome ?? a.userNome ?? a.nome ?? "").toLowerCase();

      const moduloNome =
        (a.moduloNome ?? "").toLowerCase();

      const matchesSearch =
        !s ||
        safeStr(a.id).includes(s) ||
        safeStr(a.turmaId).includes(s) ||
        turmaNome.includes(s) ||
        safeStr(a.inscricaoId).includes(s) ||
        alunoNome.includes(s) ||
        safeStr(a.turmaModuloId).includes(s) ||
        moduloNome.includes(s) ||
        safeStr(a.avaliacao).toLowerCase().includes(s);

      const matchesTurma =
        turmaFilter === "Todos" ? true : Number(turmaFilter) === Number(a.turmaId);

      return matchesSearch && matchesTurma;
    });
  }, [avaliacoes, turmas, search, turmaFilter]);

  function openCreate() {
    setEditing(null);
    setForm({
      turmaId: "",
      inscricaoId: "",
      turmaModuloId: "",
      avaliacao: "",
      observacoes: "",
    });
    setInscricoes([]);
    setTurmaModulos([]);
    setShowForm(true);
  }

  async function openEdit(a) {
    setEditing(a);

    const turmaId = String(a.turmaId ?? "");
    setForm({
      turmaId,
      inscricaoId: String(a.inscricaoId ?? ""),
      turmaModuloId: String(a.turmaModuloId ?? ""),
      avaliacao: a.avaliacao ?? "",
      observacoes: a.observacoes ?? "",
    });

    setShowForm(true);
    await loadTurmaDependencias(turmaId);
  }

  function closeForm() {
    if (saving) return;
    setShowForm(false);
    setEditing(null);
  }

  function onChange(e) {
    const { name, value } = e.target;

    // quando muda a turma, limpa os selects dependentes
    if (name === "turmaId") {
      setForm((p) => ({
        ...p,
        turmaId: value,
        inscricaoId: "",
        turmaModuloId: "",
      }));
      loadTurmaDependencias(value);
      return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  }

  function getTurmaNome(turmaId) {
    const t = turmas.find((x) => Number(x.id) === Number(turmaId));
    return t?.nome ?? `#${turmaId}`;
  }

  function getInscricaoLabel(i) {
    // depende do teu InscricaoDto. tentamos vários nomes comuns:
    const id = i.id ?? i.inscricaoId ?? "";
    const nome =
      i.formandoNome ??
      i.alunoNome ??
      i.userNome ??
      i.nome ??
      i.email ??
      "";
    return nome ? `${nome} (ID ${id})` : `Inscrição #${id}`;
  }

  function getTurmaModuloLabel(tm) {
    // do teu TurmaModuloDto: tm.moduloNome, tm.formadorNome, tm.sequencia
    const id = tm.id ?? "";
    const mod = tm.moduloNome ?? `Módulo`;
    const formador = tm.formadorNome ? ` — ${tm.formadorNome}` : "";
    const seq = (tm.sequencia ?? null) !== null ? ` (Seq ${tm.sequencia})` : "";
    return `${mod}${seq}${formador} [ID ${id}]`;
  }

  async function saveEvaluation(e) {
    e.preventDefault();
    setError("");

    const turmaIdNum = Number(form.turmaId);
    const inscricaoIdNum = Number(form.inscricaoId);
    const turmaModuloIdNum = Number(form.turmaModuloId);

    if (!Number.isFinite(turmaIdNum) || turmaIdNum <= 0) return alert("Seleciona uma turma.");
    if (!Number.isFinite(inscricaoIdNum) || inscricaoIdNum <= 0) return alert("Seleciona um aluno/inscrição.");
    if (!Number.isFinite(turmaModuloIdNum) || turmaModuloIdNum <= 0) return alert("Seleciona um módulo da turma.");

    // aceita decimal (ex: 14.5)
    const avaliacaoNum =
      form.avaliacao === "" || form.avaliacao === null
        ? null
        : Number(String(form.avaliacao).replace(",", "."));

    if (avaliacaoNum !== null && !Number.isFinite(avaliacaoNum)) {
      return alert("A avaliação tem de ser um número.");
    }

    const payload = {
      turmaId: turmaIdNum,
      inscricaoId: inscricaoIdNum,
      turmaModuloId: turmaModuloIdNum,
      avaliacao: avaliacaoNum,
      observacoes: form.observacoes?.trim() || null,
    };

    setSaving(true);
    try {
      if (editing) {
        await api.put(`${BASE}/${editing.id}`, payload);
      } else {
        await api.post(BASE, payload);
      }

      closeForm();
      await loadAll();
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Falha ao guardar avaliação.";
      setError(typeof msg === "string" ? msg : "Falha ao guardar avaliação.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvaluation(id) {
    if (!window.confirm("Tens a certeza que queres apagar esta avaliação?")) return;

    setError("");
    try {
      await api.delete(`${BASE}/${id}`);
      setAvaliacoes((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        err.response?.data ||
        "Falha ao apagar avaliação.";
      setError(typeof msg === "string" ? msg : "Falha ao apagar avaliação.");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
        <div className="container mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Avaliações</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Gestão de avaliações (CRUD) — turma, aluno, módulo e nota.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50
                         dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Voltar
            </button>

            <button
              onClick={openCreate}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              + Nova Avaliação
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm p-4 mb-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
            <div className="flex-1">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por id, turma, aluno, módulo ou nota..."
                className="w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Turma:</span>
              <select
                value={turmaFilter}
                onChange={(e) => setTurmaFilter(e.target.value)}
                className="border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100"
              >
                <option value="Todos">Todas</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} (ID {t.id})
                  </option>
                ))}
              </select>

              <div className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                Total: <span className="font-semibold">{filtered.length}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100 dark:bg-gray-800 border-b dark:border-gray-700">
                <tr>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">ID</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Turma</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Inscrição</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Módulo</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Nota</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Obs.</th>
                  <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-200 py-3 px-4">Ações</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                      A carregar...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-10 px-4 text-center text-gray-500 dark:text-gray-400">
                      Sem avaliações.
                    </td>
                  </tr>
                ) : (
                  filtered.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                    >
                      <td className="py-3 px-4 text-sm text-gray-800 dark:text-gray-200">{a.id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900 dark:text-gray-100 font-medium">
                        {getTurmaNome(a.turmaId)}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        #{a.inscricaoId}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        #{a.turmaModuloId}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {a.avaliacao ?? "—"}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-700 dark:text-gray-300">
                        {a.observacoes ? (
                          <span className="line-clamp-2">{a.observacoes}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => openEdit(a)}
                            className="px-3 py-1.5 rounded text-sm font-medium text-yellow-700 hover:bg-yellow-50
                                       dark:text-yellow-300 dark:hover:bg-yellow-900/20"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => deleteEvaluation(a.id)}
                            className="px-3 py-1.5 rounded text-sm font-medium text-red-700 hover:bg-red-50
                                       dark:text-red-300 dark:hover:bg-red-900/20"
                          >
                            Apagar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Create/Edit */}
      {showForm && (
        <Modal title={editing ? "Editar Avaliação" : "Nova Avaliação"} onClose={closeForm} disabled={saving}>
          <form onSubmit={saveEvaluation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Turma</label>
              <select
                name="turmaId"
                value={form.turmaId}
                onChange={onChange}
                disabled={saving}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 disabled:opacity-60"
              >
                <option value="">Selecionar turma...</option>
                {turmas.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome} (ID {t.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Aluno / Inscrição</label>
              <select
                name="inscricaoId"
                value={form.inscricaoId}
                onChange={onChange}
                disabled={saving || !form.turmaId}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 disabled:opacity-60"
              >
                <option value="">
                  {form.turmaId ? "Selecionar inscrição..." : "Seleciona primeiro uma turma"}
                </option>
                {inscricoes.map((i) => (
                  <option key={i.id ?? i.inscricaoId} value={i.id ?? i.inscricaoId}>
                    {getInscricaoLabel(i)}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Módulo da Turma</label>
              <select
                name="turmaModuloId"
                value={form.turmaModuloId}
                onChange={onChange}
                disabled={saving || !form.turmaId}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 disabled:opacity-60"
              >
                <option value="">
                  {form.turmaId ? "Selecionar módulo..." : "Seleciona primeiro uma turma"}
                </option>
                {turmaModulos.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {getTurmaModuloLabel(tm)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Avaliação (ex: 14.5)</label>
              <input
                name="avaliacao"
                value={form.avaliacao}
                onChange={onChange}
                disabled={saving}
                className="mt-1 w-full border rounded px-3 py-2
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 disabled:opacity-60"
                placeholder="Ex: 16"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Aceita decimais. (Se deixares vazio, guarda como null.)
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Observações</label>
              <textarea
                name="observacoes"
                value={form.observacoes}
                onChange={onChange}
                disabled={saving}
                className="mt-1 w-full border rounded px-3 py-2 min-h-[100px]
                           bg-white dark:bg-gray-900 dark:border-gray-800
                           text-gray-900 dark:text-gray-100 disabled:opacity-60"
                placeholder="Notas internas..."
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="px-4 py-2 rounded border text-gray-700 hover:bg-gray-50 disabled:opacity-60
                           dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "A guardar..." : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
