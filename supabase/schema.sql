-- ============================================================
-- Painel de Contratos — schema do banco (Supabase / Postgres)
-- Cole este arquivo inteiro no SQL Editor do Supabase e clique em "Run".
-- ============================================================

create table if not exists public.clients (
  id text primary key,
  operadora text,
  tipo_pessoa text,
  cpf_cnpj text,
  nome_contato text,
  email text,
  endereco text,
  cidade text,
  estado text,
  regiao text,
  telefone text,
  nome_unico text,
  updated_at timestamptz default now()
);

create table if not exists public.contracts (
  id text primary key,
  numero text,
  client_id text references public.clients(id) on delete set null,
  contratante_label text,
  descricao text,
  tipo_contrato text,
  responsavel text,
  periodicidade text,
  valor_contrato numeric default 0,
  valor_recebido numeric default 0,
  data_assinatura date,
  data_inicio_vigencia date,
  data_vencimento date,
  status text,
  updated_at timestamptz default now()
);

create table if not exists public.receivables (
  id text primary key,
  numero_contrato text,
  client_id text,
  contratante_label text,
  descricao text,
  data_prevista date,
  data_recebimento date,
  valor_devido_pago numeric default 0,
  recebido text,
  updated_at timestamptz default now()
);

-- Segurança: só usuários autenticados (logados) podem ler/escrever.
-- Como é um app pessoal, não filtramos por dono — qualquer conta logada
-- (só a sua, se você não permitir novos cadastros) tem acesso total.

alter table public.clients enable row level security;
alter table public.contracts enable row level security;
alter table public.receivables enable row level security;

create policy "authenticated_all_clients" on public.clients
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_all_contracts" on public.contracts
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create policy "authenticated_all_receivables" on public.receivables
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
