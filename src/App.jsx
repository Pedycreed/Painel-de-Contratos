import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  LayoutDashboard, Users, FileText, Wallet, Search, Plus, X, Pencil, Trash2,
  ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Save, ArrowUpRight, Filter, ChevronDown, LogOut, Upload
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts";
import { supabase } from "./lib/supabase";
import Login from "./Login.jsx";
import ImportContractModal from "./ImportContract.jsx";

/* ============================== DESIGN TOKENS ============================== */
const T = {
  ink: "#12212F",       // deep ledger navy - primary text / sidebar
  inkSoft: "#3C5169",   // slate - secondary text
  paper: "#F5F6F2",     // cool paper background
  paperRaised: "#FFFFFF",
  line: "#E1E3DD",
  amber: "#C7891A",     // due-soon
  amberBg: "#FBF0DC",
  red: "#B3402F",       // overdue
  redBg: "#F8E4DF",
  green: "#3F7A52",     // healthy
  greenBg: "#E3EEE3",
  blue: "#33587A",
  blueBg: "#E4EBF1",
  gray: "#8B93A0",
  grayBg: "#EDEEEA",
};

const FONT_DISPLAY = "'Iowan Old Style', 'Palatino Linotype', Georgia, serif";
const FONT_MONO = "'Menlo', 'SF Mono', 'Consolas', monospace";
const FONT_BODY = "'Inter', system-ui, -apple-system, sans-serif";

/* ============================== SUPABASE DATA LAYER ============================== */
// Conversores entre o formato usado na interface (camelCase) e as colunas do banco (snake_case).
function dbToClient(r) {
  return {
    id: r.id, operadora: r.operadora || "", tipoPessoa: r.tipo_pessoa || "Pessoa Física",
    cpfCnpj: r.cpf_cnpj || "", nomeContato: r.nome_contato || "", email: r.email || "",
    endereco: r.endereco || "", cidade: r.cidade || "", estado: r.estado || "",
    regiao: r.regiao || "", telefone: r.telefone || "", nomeUnico: r.nome_unico || "",
  };
}
function clientToDb(c) {
  return {
    id: c.id, operadora: c.operadora, tipo_pessoa: c.tipoPessoa, cpf_cnpj: c.cpfCnpj,
    nome_contato: c.nomeContato, email: c.email, endereco: c.endereco, cidade: c.cidade,
    estado: c.estado, regiao: c.regiao, telefone: c.telefone,
    nome_unico: c.nomeUnico || `${c.operadora} - ${c.cpfCnpj}`,
  };
}
function dbToContract(r) {
  return {
    id: r.id, numero: r.numero || "", clientId: r.client_id || "", contratanteLabel: r.contratante_label || "",
    descricao: r.descricao || "", tipoContrato: r.tipo_contrato || "", responsavel: r.responsavel || "",
    periodicidade: r.periodicidade || "", valorContrato: Number(r.valor_contrato) || 0,
    valorRecebido: Number(r.valor_recebido) || 0, dataAssinatura: r.data_assinatura || "",
    dataInicioVigencia: r.data_inicio_vigencia || "", dataVencimento: r.data_vencimento || "",
    status: r.status || "Pendente",
  };
}
function contractToDb(c) {
  return {
    id: c.id, numero: c.numero, client_id: c.clientId || null, contratante_label: c.contratanteLabel,
    descricao: c.descricao, tipo_contrato: c.tipoContrato, responsavel: c.responsavel,
    periodicidade: c.periodicidade, valor_contrato: c.valorContrato, valor_recebido: c.valorRecebido,
    data_assinatura: c.dataAssinatura || null, data_inicio_vigencia: c.dataInicioVigencia || null,
    data_vencimento: c.dataVencimento || null, status: c.status,
  };
}
function dbToReceb(r) {
  return {
    id: r.id, numeroContrato: r.numero_contrato || "", clientId: r.client_id || "",
    contratanteLabel: r.contratante_label || "", descricao: r.descricao || "",
    dataPrevista: r.data_prevista || "", dataRecebimento: r.data_recebimento || "",
    valorDevidoPago: Number(r.valor_devido_pago) || 0, recebido: r.recebido || "Não",
  };
}
function recebToDb(r) {
  return {
    id: r.id, numero_contrato: r.numeroContrato, client_id: r.clientId || null,
    contratante_label: r.contratanteLabel, descricao: r.descricao, data_prevista: r.dataPrevista || null,
    data_recebimento: r.dataRecebimento || null, valor_devido_pago: r.valorDevidoPago, recebido: r.recebido,
  };
}

// Busca todas as linhas de uma tabela, paginando (a API do Supabase limita a ~1000 por vez).
async function fetchAll(table) {
  let all = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + pageSize - 1);
    if (error) {
      console.error(`Erro ao buscar ${table}:`, error.message);
      break;
    }
    all = all.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}
async function upsertRow(table, row) {
  const { error } = await supabase.from(table).upsert(row);
  if (error) console.error(`Erro ao salvar em ${table}:`, error.message);
  return !error;
}
async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) console.error(`Erro ao excluir de ${table}:`, error.message);
  return !error;
}

/* ============================== UTILS ============================== */
const TIPOS_CONTRATO = ["Adesão", "PME", "PJ", "PF"];
const PERIODICIDADES = ["Mensal", "Bimestral", "Trimestral", "Semestral", "Anual"];
const STATUS_LIST = ["Ativo", "Pendente", "Cancelado", "Não Renovado"];
const RESPONSAVEIS = ["Flavia Carvalho", "Mariana Carvalho", "Bruno Kauan Dos Santos", "Jhonatan Salgueiro", "Bruna de Jesus Pereira", "Geovana Rodrigues", "Andressa de Asevedo Pires"];

function fmtBRL(v) {
  const n = Number(v) || 0;
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("pt-BR");
}
function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d - today) / 86400000);
}
function alertaFor(contract) {
  if (contract.status === "Cancelado" || contract.status === "Não Renovado") return "neutro";
  const dias = daysUntil(contract.dataVencimento);
  if (dias === null) return "neutro";
  if (dias < 0) return "vermelho";
  if (dias <= 30) return "amarelo";
  return "verde";
}
const ALERT_META = {
  vermelho: { label: "Vencido", color: T.red, bg: T.redBg, Icon: AlertTriangle },
  amarelo: { label: "A vencer", color: T.amber, bg: T.amberBg, Icon: Clock },
  verde: { label: "Em dia", color: T.green, bg: T.greenBg, Icon: CheckCircle2 },
  neutro: { label: "—", color: T.gray, bg: T.grayBg, Icon: Clock },
};
function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ============================== SMALL UI PRIMITIVES ============================== */
function Chip({ color, bg, children, icon: Icon }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
      style={{ color, backgroundColor: bg }}
    >
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      {children}
    </span>
  );
}

function Field({ label, children, span }) {
  return (
    <label className={`flex flex-col gap-1.5 ${span ? "col-span-2" : ""}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.inkSoft }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full px-3 py-2 rounded-md border text-sm outline-none transition-colors focus:ring-2";
function inputStyle() {
  return { borderColor: T.line, backgroundColor: T.paperRaised, color: T.ink };
}

function Modal({ title, onClose, children, wide }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(18,33,47,0.45)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`w-full ${wide ? "max-w-3xl" : "max-w-lg"} rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto`}
        style={{ backgroundColor: T.paperRaised }}
      >
        <div
          className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-10"
          style={{ borderColor: T.line, backgroundColor: T.paperRaised }}
        >
          <h3 className="text-lg" style={{ fontFamily: FONT_DISPLAY, color: T.ink }}>
            {title}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-black/5">
            <X size={18} color={T.inkSoft} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <Modal title="Confirmar exclusão" onClose={onCancel}>
      <p className="text-sm mb-6" style={{ color: T.inkSoft }}>
        {message}
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md text-sm font-medium border"
          style={{ borderColor: T.line, color: T.inkSoft }}
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 rounded-md text-sm font-medium text-white"
          style={{ backgroundColor: T.red }}
        >
          Excluir
        </button>
      </div>
    </Modal>
  );
}

/* ============================== KPI CARD ============================== */
function KpiCard({ label, value, sub, accent, Icon }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2 border"
      style={{ backgroundColor: T.paperRaised, borderColor: T.line }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.inkSoft }}>
          {label}
        </span>
        {Icon && (
          <div className="p-1.5 rounded-md" style={{ backgroundColor: accent + "20" }}>
            <Icon size={14} color={accent} />
          </div>
        )}
      </div>
      <span className="text-2xl" style={{ fontFamily: FONT_MONO, color: T.ink, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: T.inkSoft }}>
          {sub}
        </span>
      )}
    </div>
  );
}

/* ============================== PAGINATION ============================== */
function Pagination({ page, setPage, total, pageSize }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-between px-1 py-3 text-sm" style={{ color: T.inkSoft }}>
      <span>
        {total === 0 ? "0 registros" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} de ${total}`}
      </span>
      <div className="flex items-center gap-1">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="p-1.5 rounded-md border disabled:opacity-30"
          style={{ borderColor: T.line }}
        >
          <ChevronLeft size={14} />
        </button>
        <span className="px-2 text-xs" style={{ fontFamily: FONT_MONO }}>
          {page} / {pages}
        </span>
        <button
          disabled={page >= pages}
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          className="p-1.5 rounded-md border disabled:opacity-30"
          style={{ borderColor: T.line }}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

/* ============================== APP ============================== */
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = checking, null = logged out
  const [loaded, setLoaded] = useState(false);
  const [clients, setClients] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [receivables, setReceivables] = useState([]);
  const [page, setPageNav] = useState("dashboard");
  const [syncError, setSyncError] = useState("");

  // auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => listener.subscription.unsubscribe();
  }, []);

  // load data from Supabase once logged in
  useEffect(() => {
    if (!session) return;
    (async () => {
      setLoaded(false);
      const [c, k, r] = await Promise.all([fetchAll("clients"), fetchAll("contracts"), fetchAll("receivables")]);
      setClients(c.map(dbToClient));
      setContracts(k.map(dbToContract));
      setReceivables(r.map(dbToReceb));
      setLoaded(true);
    })();
  }, [session]);

  const clientsById = useMemo(() => {
    const m = {};
    clients.forEach((c) => (m[c.id] = c));
    return m;
  }, [clients]);

  function clientLabel(contractOrReceb) {
    const c = clientsById[contractOrReceb.clientId];
    if (c) return c.nomeUnico || `${c.operadora} - ${c.cpfCnpj}`;
    return contractOrReceb.contratanteLabel || "Cliente não vinculado";
  }

  // CRUD helpers that sync with Supabase and update local state optimistically
  async function saveClient(client) {
    const withLabel = { ...client, nomeUnico: client.nomeUnico || `${client.operadora} - ${client.cpfCnpj}` };
    setClients((prev) => (prev.some((p) => p.id === withLabel.id) ? prev.map((p) => (p.id === withLabel.id ? withLabel : p)) : [withLabel, ...prev]));
    const ok = await upsertRow("clients", clientToDb(withLabel));
    if (!ok) setSyncError("Não foi possível salvar o cliente no banco. Verifique sua conexão.");
  }
  async function removeClient(id) {
    setClients((prev) => prev.filter((p) => p.id !== id));
    const ok = await deleteRow("clients", id);
    if (!ok) setSyncError("Não foi possível excluir o cliente no banco.");
  }
  async function saveContract(contract) {
    setContracts((prev) => (prev.some((p) => p.id === contract.id) ? prev.map((p) => (p.id === contract.id ? contract : p)) : [contract, ...prev]));
    const ok = await upsertRow("contracts", contractToDb(contract));
    if (!ok) setSyncError("Não foi possível salvar o contrato no banco.");
  }
  async function removeContract(id) {
    setContracts((prev) => prev.filter((p) => p.id !== id));
    const ok = await deleteRow("contracts", id);
    if (!ok) setSyncError("Não foi possível excluir o contrato no banco.");
  }
  async function saveReceb(r) {
    setReceivables((prev) => (prev.some((p) => p.id === r.id) ? prev.map((p) => (p.id === r.id ? r : p)) : [r, ...prev]));
    const ok = await upsertRow("receivables", recebToDb(r));
    if (!ok) setSyncError("Não foi possível salvar o recebimento no banco.");
  }
  async function removeReceb(id) {
    setReceivables((prev) => prev.filter((p) => p.id !== id));
    const ok = await deleteRow("receivables", id);
    if (!ok) setSyncError("Não foi possível excluir o recebimento no banco.");
  }

  if (session === undefined) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: T.paper }}>
        <span style={{ fontFamily: FONT_DISPLAY, color: T.inkSoft }}>Carregando…</span>
      </div>
    );
  }
  if (!session) {
    return <Login />;
  }
  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: T.paper }}>
        <span style={{ fontFamily: FONT_DISPLAY, color: T.inkSoft }}>Carregando seus dados…</span>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ backgroundColor: T.paper, fontFamily: FONT_BODY }}>
      <Sidebar
        page={page}
        setPage={setPageNav}
        counts={{ clients: clients.length, contracts: contracts.length }}
        onSignOut={() => supabase.auth.signOut()}
      />
      <main className="flex-1 overflow-y-auto">
        {syncError && (
          <div className="px-8 pt-4">
            <div className="text-xs px-3 py-2 rounded-md" style={{ backgroundColor: T.redBg, color: T.red }}>
              {syncError}{" "}
              <button className="underline" onClick={() => setSyncError("")}>
                dispensar
              </button>
            </div>
          </div>
        )}
        {page === "dashboard" && (
          <Dashboard contracts={contracts} clients={clients} clientLabel={clientLabel} setPage={setPageNav} />
        )}
        {page === "clientes" && (
          <ClientesPage clients={clients} contracts={contracts} onSave={saveClient} onRemove={removeClient} />
        )}
        {page === "contratos" && (
          <ContratosPage
            contracts={contracts}
            clients={clients}
            clientLabel={clientLabel}
            onSave={saveContract}
            onRemove={removeContract}
          />
        )}
        {page === "recebimentos" && (
          <RecebimentosPage
            receivables={receivables}
            contracts={contracts}
            clientLabel={clientLabel}
            onSave={saveReceb}
            onRemove={removeReceb}
          />
        )}
      </main>
    </div>
  );
}

/* ============================== SIDEBAR ============================== */
function Sidebar({ page, setPage, counts, onSignOut }) {
  const items = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { id: "clientes", label: "Clientes", Icon: Users, count: counts.clients },
    { id: "contratos", label: "Contratos", Icon: FileText, count: counts.contracts },
    { id: "recebimentos", label: "Recebimentos", Icon: Wallet },
  ];
  return (
    <aside className="w-60 shrink-0 flex flex-col py-6 px-4" style={{ backgroundColor: T.ink }}>
      <div className="px-2 mb-8">
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: "#7C93A8" }}>
          Corretora
        </div>
        <div className="text-xl mt-1" style={{ fontFamily: FONT_DISPLAY, color: "#F5F6F2" }}>
          Painel de Contratos
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {items.map(({ id, label, Icon, count }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{
                backgroundColor: active ? "rgba(245,246,242,0.1)" : "transparent",
                color: active ? "#F5F6F2" : "#9FB0C0",
              }}
            >
              <span className="flex items-center gap-2.5">
                <Icon size={16} />
                {label}
              </span>
              {count !== undefined && (
                <span className="text-[11px]" style={{ fontFamily: FONT_MONO, color: "#7C93A8" }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto px-2 pt-6 flex flex-col gap-3">
        <div className="text-[11px] leading-relaxed" style={{ color: "#5E7186" }}>
          Dados sincronizados na nuvem.
        </div>
        <button
          onClick={onSignOut}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
          style={{ color: "#9FB0C0" }}
        >
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </aside>
  );
}

/* ============================== DASHBOARD ============================== */
function Dashboard({ contracts, clients, clientLabel, setPage }) {
  const stats = useMemo(() => {
    let total = 0,
      ativos = 0,
      vencidos = 0,
      aVencer = 0,
      valorTotal = 0,
      valorRecebido = 0,
      cancelados = 0;
    contracts.forEach((c) => {
      total += 1;
      valorTotal += Number(c.valorContrato) || 0;
      valorRecebido += Number(c.valorRecebido) || 0;
      if (c.status === "Ativo") ativos += 1;
      if (c.status === "Cancelado") cancelados += 1;
      const al = alertaFor(c);
      if (al === "vermelho") vencidos += 1;
      if (al === "amarelo") aVencer += 1;
    });
    return { total, ativos, vencidos, aVencer, valorTotal, valorRecebido, valorAReceber: valorTotal - valorRecebido, cancelados };
  }, [contracts]);

  const statusData = useMemo(() => {
    const groups = { Ativo: 0, Pendente: 0, Cancelado: 0, "Não Renovado": 0 };
    contracts.forEach((c) => {
      groups[c.status] = (groups[c.status] || 0) + 1;
    });
    return Object.entries(groups).map(([name, value]) => ({ name, value }));
  }, [contracts]);

  const STATUS_COLORS = { Ativo: T.green, Pendente: T.amber, Cancelado: T.red, "Não Renovado": T.gray };

  const topClientes = useMemo(() => {
    const m = {};
    contracts.forEach((c) => {
      const key = clientLabel(c);
      if (!m[key]) m[key] = { name: key, valor: 0, qtd: 0 };
      m[key].valor += Number(c.valorContrato) || 0;
      m[key].qtd += 1;
    });
    return Object.values(m)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8)
      .map((d) => ({ ...d, shortName: d.name.length > 22 ? d.name.slice(0, 20) + "…" : d.name }));
  }, [contracts, clientLabel]);

  const vencimentosMes = useMemo(() => {
    const m = {};
    contracts.forEach((c) => {
      if (!c.dataVencimento || c.status !== "Ativo") return;
      const key = c.dataVencimento.slice(0, 7);
      m[key] = (m[key] || 0) + (Number(c.valorContrato) || 0);
    });
    return Object.entries(m)
      .sort((a, b) => (a[0] > b[0] ? 1 : -1))
      .slice(-12)
      .map(([mes, valor]) => ({ mes: mes.slice(2).replace("-", "/"), valor: Math.round(valor) }));
  }, [contracts]);

  const alertList = useMemo(() => {
    return contracts
      .filter((c) => c.status === "Ativo")
      .map((c) => ({ c, al: alertaFor(c), dias: daysUntil(c.dataVencimento) }))
      .filter((x) => x.al === "vermelho" || x.al === "amarelo")
      .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0))
      .slice(0, 8);
  }, [contracts]);

  return (
    <div className="p-8 max-w-[1400px]">
      <header className="mb-6">
        <h1 className="text-3xl" style={{ fontFamily: FONT_DISPLAY, color: T.ink }}>
          Visão geral
        </h1>
        <p className="text-sm mt-1" style={{ color: T.inkSoft }}>
          {clients.length} clientes · {contracts.length} contratos cadastrados
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Contratos ativos" value={stats.ativos} sub={`de ${stats.total} no total`} accent={T.blue} Icon={FileText} />
        <KpiCard label="Vencidos" value={stats.vencidos} sub="requerem ação" accent={T.red} Icon={AlertTriangle} />
        <KpiCard label="A vencer (30d)" value={stats.aVencer} sub="renovação próxima" accent={T.amber} Icon={Clock} />
        <KpiCard label="Valor total" value={fmtBRL(stats.valorTotal)} sub="carteira de contratos" accent={T.ink} Icon={TrendingUp} />
        <KpiCard label="Valor recebido" value={fmtBRL(stats.valorRecebido)} accent={T.green} Icon={CheckCircle2} />
        <KpiCard label="Valor a receber" value={fmtBRL(stats.valorAReceber)} accent={T.amber} Icon={Wallet} />
        <KpiCard label="Cancelados" value={stats.cancelados} accent={T.gray} Icon={X} />
        <KpiCard
          label="Ticket médio"
          value={fmtBRL(stats.total ? stats.valorTotal / stats.total : 0)}
          accent={T.blue}
          Icon={ArrowUpRight}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-xl p-5 border" style={{ backgroundColor: T.paperRaised, borderColor: T.line }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: T.ink }}>
            Top clientes por valor contratado
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topClientes} layout="vertical" margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.line} horizontal={false} />
              <XAxis type="number" tickFormatter={(v) => fmtBRL(v)} tick={{ fontSize: 11, fill: T.inkSoft }} />
              <YAxis type="category" dataKey="shortName" width={160} tick={{ fontSize: 11, fill: T.ink }} />
              <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="valor" fill={T.blue} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-5 border" style={{ backgroundColor: T.paperRaised, borderColor: T.line }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: T.ink }}>
            Contratos por status
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {statusData.map((entry, i) => (
                  <Cell key={i} fill={STATUS_COLORS[entry.name] || T.gray} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-col gap-1.5 mt-2">
            {statusData.map((s) => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5" style={{ color: T.inkSoft }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[s.name] }} />
                  {s.name}
                </span>
                <span style={{ fontFamily: FONT_MONO, color: T.ink }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl p-5 border" style={{ backgroundColor: T.paperRaised, borderColor: T.line }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: T.ink }}>
            Valor de vencimento por mês (contratos ativos)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={vencimentosMes}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.line} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: T.inkSoft }} />
              <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 11, fill: T.inkSoft }} />
              <Tooltip formatter={(v) => fmtBRL(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey="valor" stroke={T.blue} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-5 border flex flex-col" style={{ backgroundColor: T.paperRaised, borderColor: T.line }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: T.ink }}>
              Alertas prioritários
            </h3>
            <button onClick={() => setPage("contratos")} className="text-xs font-medium" style={{ color: T.blue }}>
              Ver todos
            </button>
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[220px]">
            {alertList.length === 0 && (
              <span className="text-xs" style={{ color: T.inkSoft }}>
                Nenhum alerta ativo no momento.
              </span>
            )}
            {alertList.map(({ c, al, dias }) => {
              const meta = ALERT_META[al];
              return (
                <div key={c.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0" style={{ borderColor: T.line }}>
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: T.ink }}>
                      {clientLabel(c)}
                    </div>
                    <div className="text-[11px]" style={{ color: T.inkSoft }}>
                      Contrato {c.numero}
                    </div>
                  </div>
                  <Chip color={meta.color} bg={meta.bg}>
                    {dias < 0 ? `${Math.abs(dias)}d atraso` : `${dias}d`}
                  </Chip>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================== CLIENTES PAGE ============================== */
function emptyClient() {
  return {
    id: uid("c"),
    operadora: "",
    tipoPessoa: "Pessoa Física",
    cpfCnpj: "",
    nomeContato: "",
    email: "",
    endereco: "",
    cidade: "",
    estado: "",
    regiao: "",
    telefone: "",
    nomeUnico: "",
  };
}

function ClientesPage({ clients, contracts, onSave, onRemove }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // client object or null
  const [deleting, setDeleting] = useState(null);
  const pageSize = 20;

  const contractCountByClient = useMemo(() => {
    const m = {};
    contracts.forEach((c) => {
      if (c.clientId) m[c.clientId] = (m[c.clientId] || 0) + 1;
    });
    return m;
  }, [contracts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.operadora, c.nomeContato, c.cpfCnpj, c.email, c.cidade].join(" ").toLowerCase().includes(q)
    );
  }, [clients, query]);

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  function openNew() {
    setEditing(emptyClient());
  }
  function openEdit(c) {
    setEditing({ ...c });
  }
  function save(c) {
    onSave(c);
    setEditing(null);
  }
  function remove(id) {
    onRemove(id);
    setDeleting(null);
  }

  return (
    <div className="p-8 max-w-[1400px]">
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} clientes cadastrados`}
        query={query}
        setQuery={(v) => {
          setQuery(v);
          setPage(1);
        }}
        onNew={openNew}
        newLabel="Novo cliente"
      />

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: T.paperRaised, borderColor: T.line }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: T.paper }}>
              {["Operadora", "Tipo", "CPF/CNPJ", "Contato", "Cidade/UF", "Contratos", ""].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.inkSoft }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c) => (
              <tr key={c.id} className="border-t hover:bg-black/[0.02]" style={{ borderColor: T.line }}>
                <td className="px-4 py-2.5 font-medium" style={{ color: T.ink }}>
                  {c.operadora}
                </td>
                <td className="px-4 py-2.5" style={{ color: T.inkSoft }}>
                  {c.tipoPessoa === "Pessoa Jurídica" ? "PJ" : "PF"}
                </td>
                <td className="px-4 py-2.5" style={{ fontFamily: FONT_MONO, color: T.inkSoft, fontSize: 12 }}>
                  {c.cpfCnpj}
                </td>
                <td className="px-4 py-2.5" style={{ color: T.ink }}>
                  <div>{c.nomeContato}</div>
                  <div className="text-[11px]" style={{ color: T.inkSoft }}>
                    {c.email}
                  </div>
                </td>
                <td className="px-4 py-2.5" style={{ color: T.inkSoft }}>
                  {c.cidade}/{c.estado}
                </td>
                <td className="px-4 py-2.5" style={{ fontFamily: FONT_MONO, color: T.ink }}>
                  {contractCountByClient[c.id] || 0}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-black/5">
                      <Pencil size={14} color={T.inkSoft} />
                    </button>
                    <button onClick={() => setDeleting(c)} className="p-1.5 rounded-md hover:bg-black/5">
                      <Trash2 size={14} color={T.red} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-sm" style={{ color: T.inkSoft }}>
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} total={filtered.length} pageSize={pageSize} />

      {editing && <ClientForm client={editing} onCancel={() => setEditing(null)} onSave={save} />}
      {deleting && (
        <ConfirmDialog
          message={`Excluir o cliente "${deleting.operadora} - ${deleting.nomeContato}"? Contratos vinculados manterão o nome, mas perderão o vínculo.`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove(deleting.id)}
        />
      )}
    </div>
  );
}

function ClientForm({ client, onCancel, onSave }) {
  const [form, setForm] = useState(client);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Modal title={client.operadora ? "Editar cliente" : "Novo cliente"} onClose={onCancel} wide>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Operadora / Convênio">
          <input className={inputCls} style={inputStyle()} value={form.operadora} onChange={set("operadora")} />
        </Field>
        <Field label="Tipo de pessoa">
          <select className={inputCls} style={inputStyle()} value={form.tipoPessoa} onChange={set("tipoPessoa")}>
            <option>Pessoa Física</option>
            <option>Pessoa Jurídica</option>
          </select>
        </Field>
        <Field label="CPF / CNPJ">
          <input className={inputCls} style={inputStyle()} value={form.cpfCnpj} onChange={set("cpfCnpj")} />
        </Field>
        <Field label="Nome do contato">
          <input className={inputCls} style={inputStyle()} value={form.nomeContato} onChange={set("nomeContato")} />
        </Field>
        <Field label="E-mail">
          <input className={inputCls} style={inputStyle()} value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Telefone">
          <input className={inputCls} style={inputStyle()} value={form.telefone} onChange={set("telefone")} />
        </Field>
        <Field label="Endereço" span>
          <input className={inputCls} style={inputStyle()} value={form.endereco} onChange={set("endereco")} />
        </Field>
        <Field label="Cidade">
          <input className={inputCls} style={inputStyle()} value={form.cidade} onChange={set("cidade")} />
        </Field>
        <Field label="Estado (UF)">
          <input className={inputCls} style={inputStyle()} value={form.estado} onChange={set("estado")} maxLength={2} />
        </Field>
        <Field label="Região" span>
          <input className={inputCls} style={inputStyle()} value={form.regiao} onChange={set("regiao")} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onCancel} className="px-4 py-2 rounded-md text-sm font-medium border" style={{ borderColor: T.line, color: T.inkSoft }}>
          Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          className="px-4 py-2 rounded-md text-sm font-medium text-white flex items-center gap-1.5"
          style={{ backgroundColor: T.ink }}
        >
          <Save size={14} />
          Salvar
        </button>
      </div>
    </Modal>
  );
}

/* ============================== CONTRATOS PAGE ============================== */
function emptyContract() {
  return {
    id: uid("k"),
    numero: "",
    clientId: "",
    contratanteLabel: "",
    descricao: "",
    tipoContrato: "Adesão",
    responsavel: RESPONSAVEIS[0],
    periodicidade: "Anual",
    valorContrato: 0,
    valorRecebido: 0,
    dataAssinatura: "",
    dataInicioVigencia: "",
    dataVencimento: "",
    status: "Ativo",
  };
}

function ContratosPage({ contracts, clients, clientLabel, onSave, onRemove }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [alertFilter, setAlertFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importNote, setImportNote] = useState("");
  const pageSize = 20;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contracts.filter((c) => {
      if (statusFilter !== "Todos" && c.status !== statusFilter) return false;
      if (alertFilter !== "Todos" && alertaFor(c) !== alertFilter) return false;
      if (!q) return true;
      return [c.numero, clientLabel(c), c.responsavel, c.tipoContrato].join(" ").toLowerCase().includes(q);
    });
  }, [contracts, query, statusFilter, alertFilter, clientLabel]);

  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  function openNew() {
    setEditing(emptyContract());
  }
  function handleExtracted({ fields, method, note }) {
    setImporting(false);
    const draft = { ...emptyContract(), ...fields };
    setEditing(draft);
    setImportNote(
      note || (method === "ocr-imagem" || method === "ocr-pdf-imagem"
        ? "Texto lido via OCR — confira os valores com atenção, fotos podem gerar erros de leitura."
        : "Confira os campos abaixo antes de salvar.")
    );
  }
  function openEdit(c) {
    setEditing({ ...c });
  }
  function save(c) {
    onSave(c);
    setEditing(null);
  }
  function remove(id) {
    onRemove(id);
    setDeleting(null);
  }

  return (
    <div className="p-8 max-w-[1400px]">
      <PageHeader
        title="Contratos"
        subtitle={`${contracts.length} contratos cadastrados`}
        query={query}
        setQuery={(v) => {
          setQuery(v);
          setPage(1);
        }}
        onNew={openNew}
        newLabel="Novo contrato"
      >
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-md border text-sm"
          style={inputStyle()}
        >
          <option>Todos</option>
          {STATUS_LIST.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          value={alertFilter}
          onChange={(e) => {
            setAlertFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-md border text-sm"
          style={inputStyle()}
        >
          <option value="Todos">Todos os alertas</option>
          <option value="vermelho">Vencidos</option>
          <option value="amarelo">A vencer (30d)</option>
          <option value="verde">Em dia</option>
        </select>
        <button
          onClick={() => setImporting(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border"
          style={{ borderColor: T.line, color: T.ink }}
        >
          <Upload size={14} />
          Importar contrato
        </button>
      </PageHeader>

      <div className="rounded-xl border overflow-hidden overflow-x-auto" style={{ backgroundColor: T.paperRaised, borderColor: T.line }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: T.paper }}>
              {["Nº", "Contratante", "Tipo", "Valor", "Vencimento", "Status", "Alerta", ""].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: T.inkSoft }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.map((c) => {
              const al = alertaFor(c);
              const meta = ALERT_META[al];
              const dias = daysUntil(c.dataVencimento);
              return (
                <tr key={c.id} className="border-t hover:bg-black/[0.02]" style={{ borderColor: T.line }}>
                  <td className="px-4 py-2.5" style={{ fontFamily: FONT_MONO, color: T.ink, fontSize: 12 }}>
                    {c.numero}
                  </td>
                  <td className="px-4 py-2.5 max-w-[220px] truncate" style={{ color: T.ink }}>
                    {clientLabel(c)}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: T.inkSoft }}>
                    {c.tipoContrato}
                  </td>
                  <td className="px-4 py-2.5" style={{ fontFamily: FONT_MONO, color: T.ink, fontSize: 12 }}>
                    {fmtBRL(c.valorContrato)}
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: T.inkSoft }}>
                    {fmtDate(c.dataVencimento)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs" style={{ color: T.inkSoft }}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Chip color={meta.color} bg={meta.bg} icon={meta.Icon}>
                      {al === "neutro" ? meta.label : dias < 0 ? `${Math.abs(dias)}d atraso` : `${dias}d`}
                    </Chip>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-md hover:bg-black/5">
                        <Pencil size={14} color={T.inkSoft} />
                      </button>
                      <button onClick={() => setDeleting(c)} className="p-1.5 rounded-md hover:bg-black/5">
                        <Trash2 size={14} color={T.red} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-10 text-sm" style={{ color: T.inkSoft }}>
                  Nenhum contrato encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} setPage={setPage} total={filtered.length} pageSize={pageSize} />

      {editing && (
        <ContractForm
          contract={editing}
          clients={clients}
          onCancel={() => {
            setEditing(null);
            setImportNote("");
          }}
          onSave={(c) => {
            save(c);
            setImportNote("");
          }}
          reviewNote={importNote}
        />
      )}
      {deleting && (
        <ConfirmDialog
          message={`Excluir o contrato nº ${deleting.numero}?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => remove(deleting.id)}
        />
      )}
      {importing && (
        <ImportContractModal clients={clients} onClose={() => setImporting(false)} onExtracted={handleExtracted} />
      )}
    </div>
  );
}

function ContractForm({ contract, clients, onCancel, onSave, reviewNote }) {
  const [form, setForm] = useState(contract);
  const [clientQuery, setClientQuery] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setNum = (k) => (e) => setForm((f) => ({ ...f, [k]: parseFloat(e.target.value) || 0 }));

  const clientMatches = useMemo(() => {
    if (!clientQuery.trim()) return [];
    const q = clientQuery.toLowerCase();
    return clients.filter((c) => (c.nomeUnico || "").toLowerCase().includes(q)).slice(0, 6);
  }, [clientQuery, clients]);

  const selectedClient = clients.find((c) => c.id === form.clientId);

  return (
    <Modal title={reviewNote ? "Revisar contrato importado" : contract.numero ? "Editar contrato" : "Novo contrato"} onClose={onCancel} wide>
      {reviewNote && (
        <div className="flex items-start gap-2 mb-4 text-xs px-3 py-2 rounded-md" style={{ backgroundColor: T.amberBg, color: T.amber }}>
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <span>{reviewNote}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nº do contrato">
          <input className={inputCls} style={inputStyle()} value={form.numero} onChange={set("numero")} />
        </Field>
        <Field label="Cliente / contratante">
          {selectedClient ? (
            <div className="flex items-center justify-between px-3 py-2 rounded-md border text-sm" style={inputStyle()}>
              <span className="truncate">{selectedClient.nomeUnico}</span>
              <button onClick={() => setForm((f) => ({ ...f, clientId: "" }))}>
                <X size={14} color={T.inkSoft} />
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                className={inputCls}
                style={inputStyle()}
                placeholder="Buscar cliente por nome…"
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
              />
              {clientMatches.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border shadow-lg max-h-48 overflow-y-auto" style={{ backgroundColor: T.paperRaised, borderColor: T.line }}>
                  {clientMatches.map((c) => (
                    <button
                      key={c.id}
                      className="block w-full text-left px-3 py-2 text-xs hover:bg-black/5"
                      onClick={() => {
                        setForm((f) => ({ ...f, clientId: c.id, contratanteLabel: c.nomeUnico }));
                        setClientQuery("");
                      }}
                    >
                      {c.nomeUnico}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Field>
        <Field label="Tipo de contrato">
          <select className={inputCls} style={inputStyle()} value={form.tipoContrato} onChange={set("tipoContrato")}>
            {TIPOS_CONTRATO.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Responsável">
          <select className={inputCls} style={inputStyle()} value={form.responsavel} onChange={set("responsavel")}>
            {RESPONSAVEIS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Periodicidade">
          <select className={inputCls} style={inputStyle()} value={form.periodicidade} onChange={set("periodicidade")}>
            {PERIODICIDADES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className={inputCls} style={inputStyle()} value={form.status} onChange={set("status")}>
            {STATUS_LIST.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Valor do contrato (R$)">
          <input type="number" step="0.01" className={inputCls} style={inputStyle()} value={form.valorContrato} onChange={setNum("valorContrato")} />
        </Field>
        <Field label="Valor recebido (R$)">
          <input type="number" step="0.01" className={inputCls} style={inputStyle()} value={form.valorRecebido} onChange={setNum("valorRecebido")} />
        </Field>
        <Field label="Data de assinatura">
          <input type="date" className={inputCls} style={inputStyle()} value={form.dataAssinatura || ""} onChange={set("dataAssinatura")} />
        </Field>
        <Field label="Início de vigência">
          <input type="date" className={inputCls} style={inputStyle()} value={form.dataInicioVigencia || ""} onChange={set("dataInicioVigencia")} />
        </Field>
        <Field label="Data de vencimento">
          <input type="date" className={inputCls} style={inputStyle()} value={form.dataVencimento || ""} onChange={set("dataVencimento")} />
        </Field>
        <Field label="Descrição" span>
          <input className={inputCls} style={inputStyle()} value={form.descricao} onChange={set("descricao")} />
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onCancel} className="px-4 py-2 rounded-md text-sm font-medium border" style={{ borderColor: T.line, color: T.inkSoft }}>
          Cancelar
        </button>
        <button
          onClick={() => onSave(form)}
          className="px-4 py-2 rounded-md text-sm font-medium text-white flex items-center gap-1.5"
          style={{ backgroundColor: T.ink }}
        >
          <Save size={14} />
          Salvar
        </button>
      </div>
    </Modal>
  );
}

/* ============================== RECEBIMENTOS PAGE ============================== */
function emptyReceb() {
  return {
    id: uid("r"),
    numeroContrato: "",
    clientId: "",
    contratanteLabel: "",
    descricao: "",
    dataPrevista: "",
    dataRecebimento: "",
    valorDevidoPago: 0,
    recebido: "Não",
  };
}

function RecebimentosPage({ receivables, contracts, clientLabel, onSave, onRemove }) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return receivables;
    return receivables.filter((r) =>
      [r.numeroContrato, r.contratanteLabel, r.descricao].join(" ").toLowerCase().includes(q)
    );
  }, [receivables, query]);

  function save(r) {
    onSave(r);
    setEditing(null);
  }
  function remove(id) {
    onRemove(id);
    setDeleting(null);
  }
  function toggleRecebido(r) {
    save({ ...r, recebido: r.recebido === "Sim" ? "Não" : "Sim", dataRecebimento: r.recebido === "Sim" ? "" : new Date().toISOString().slice(0, 10) });
  }

  return (
    <div className="p-8 max-w-[1400px]">
      <PageHeader
        title="Recebimentos"
        subtitle={`${receivables.length} lançamentos`}
        query={query}
        setQuery={setQuery}
        onNew={() => setEditing(emptyReceb())}
        newLabel="Novo recebimento"
      />

      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: T.paperRaised, borderColor: T.line }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: T.paper }}>
              {["Contrato", "Contratante", "Descrição", "Previsto", "Valor", "Recebido", ""].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: T.inkSoft }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t hover:bg-black/[0.02]" style={{ borderColor: T.line }}>
                <td className="px-4 py-2.5" style={{ fontFamily: FONT_MONO, color: T.ink, fontSize: 12 }}>
                  {r.numeroContrato}
                </td>
                <td className="px-4 py-2.5 max-w-[200px] truncate" style={{ color: T.ink }}>
                  {r.contratanteLabel}
                </td>
                <td className="px-4 py-2.5" style={{ color: T.inkSoft }}>
                  {r.descricao}
                </td>
                <td className="px-4 py-2.5" style={{ color: T.inkSoft }}>
                  {fmtDate(r.dataPrevista)}
                </td>
                <td className="px-4 py-2.5" style={{ fontFamily: FONT_MONO, color: T.ink, fontSize: 12 }}>
                  {fmtBRL(r.valorDevidoPago)}
                </td>
                <td className="px-4 py-2.5">
                  <button onClick={() => toggleRecebido(r)}>
                    <Chip color={r.recebido === "Sim" ? T.green : T.amber} bg={r.recebido === "Sim" ? T.greenBg : T.amberBg}>
                      {r.recebido === "Sim" ? "Recebido" : "Pendente"}
                    </Chip>
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => setEditing({ ...r })} className="p-1.5 rounded-md hover:bg-black/5">
                      <Pencil size={14} color={T.inkSoft} />
                    </button>
                    <button onClick={() => setDeleting(r)} className="p-1.5 rounded-md hover:bg-black/5">
                      <Trash2 size={14} color={T.red} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-sm" style={{ color: T.inkSoft }}>
                  Nenhum recebimento encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <RecebForm receb={editing} contracts={contracts} clientLabel={clientLabel} onCancel={() => setEditing(null)} onSave={save} />
      )}
      {deleting && (
        <ConfirmDialog message="Excluir este lançamento de recebimento?" onCancel={() => setDeleting(null)} onConfirm={() => remove(deleting.id)} />
      )}
    </div>
  );
}

function RecebForm({ receb, contracts, clientLabel, onCancel, onSave }) {
  const [form, setForm] = useState(receb);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setNum = (k) => (e) => setForm((f) => ({ ...f, [k]: parseFloat(e.target.value) || 0 }));

  return (
    <Modal title={receb.numeroContrato ? "Editar recebimento" : "Novo recebimento"} onClose={onCancel}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Nº do contrato">
          <input className={inputCls} style={inputStyle()} value={form.numeroContrato} onChange={set("numeroContrato")} />
        </Field>
        <Field label="Contratante">
          <input className={inputCls} style={inputStyle()} value={form.contratanteLabel} onChange={set("contratanteLabel")} />
        </Field>
        <Field label="Descrição" span>
          <input className={inputCls} style={inputStyle()} value={form.descricao} onChange={set("descricao")} placeholder="Ex: Parcela 3/12" />
        </Field>
        <Field label="Data prevista">
          <input type="date" className={inputCls} style={inputStyle()} value={form.dataPrevista || ""} onChange={set("dataPrevista")} />
        </Field>
        <Field label="Valor (R$)">
          <input type="number" step="0.01" className={inputCls} style={inputStyle()} value={form.valorDevidoPago} onChange={setNum("valorDevidoPago")} />
        </Field>
        <Field label="Recebido?">
          <select className={inputCls} style={inputStyle()} value={form.recebido} onChange={set("recebido")}>
            <option>Não</option>
            <option>Sim</option>
          </select>
        </Field>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <button onClick={onCancel} className="px-4 py-2 rounded-md text-sm font-medium border" style={{ borderColor: T.line, color: T.inkSoft }}>
          Cancelar
        </button>
        <button onClick={() => onSave(form)} className="px-4 py-2 rounded-md text-sm font-medium text-white flex items-center gap-1.5" style={{ backgroundColor: T.ink }}>
          <Save size={14} />
          Salvar
        </button>
      </div>
    </Modal>
  );
}

/* ============================== SHARED PAGE HEADER ============================== */
function PageHeader({ title, subtitle, query, setQuery, onNew, newLabel, children }) {
  return (
    <header className="mb-5 flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-3xl" style={{ fontFamily: FONT_DISPLAY, color: T.ink }}>
          {title}
        </h1>
        <p className="text-sm mt-1" style={{ color: T.inkSoft }}>
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color={T.inkSoft} />
          <input
            className="pl-8 pr-3 py-2 rounded-md border text-sm w-56"
            style={inputStyle()}
            placeholder="Buscar…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {children}
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium text-white"
          style={{ backgroundColor: T.ink }}
        >
          <Plus size={14} />
          {newLabel}
        </button>
      </div>
    </header>
  );
}
