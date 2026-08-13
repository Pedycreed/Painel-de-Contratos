# Painel de Contratos — guia de publicação

Este projeto é o seu painel de gestão de contratos/clientes, pronto para
rodar como site (GitHub Pages) com os dados salvos num banco de dados na
nuvem (Supabase), para você acessar e editar de qualquer computador ou
celular com o mesmo login.

Siga os passos na ordem. Não precisa saber programar — é só copiar e colar.

---

## Parte 1 — Criar o banco de dados (Supabase)

1. Acesse **https://supabase.com** e crie uma conta gratuita (pode ser com GitHub).
2. Clique em **New project**. Escolha um nome (ex: `painel-contratos`), uma senha
   de banco (guarde, mas você não vai precisar dela no dia a dia) e a região
   mais próxima (ex: São Paulo/`sa-east-1` se disponível).
3. Espere o projeto ser criado (leva 1–2 minutos).
4. No menu à esquerda, clique em **SQL Editor** → **New query**.
5. Abra o arquivo `supabase/schema.sql` (que está nesta pasta), copie todo o
   conteúdo, cole no editor e clique em **Run**. Isso cria as 3 tabelas
   (`clients`, `contracts`, `receivables`) já com segurança configurada.
6. Agora vamos importar os dados da sua planilha:
   - Menu à esquerda → **Table Editor**.
   - Clique na tabela **clients** → botão **Insert** → **Import data from CSV** →
     selecione o arquivo `supabase/clients.csv` → confirme o mapeamento de
     colunas (deve casar automaticamente pelo nome) → **Import**.
   - Repita o mesmo processo para `contracts.csv` na tabela **contracts**.
   - Repita para `receivables.csv` na tabela **receivables** (esse arquivo tem
     só 1 linha de exemplo — normal, sua planilha original também tinha só isso).
7. Menu à esquerda → **Authentication** → **Users** → **Add user** → **Create
   new user**. Cadastre seu e-mail e uma senha — essa será sua conta de login
   no painel. Marque **Auto Confirm User** para não precisar confirmar e-mail.
8. (Recomendado) Em **Authentication → Providers → Email**, desative
   "**Allow new users to sign up**" depois de criar sua conta, assim ninguém
   mais consegue criar login no seu painel.
9. Por fim, pegue suas credenciais: **Project Settings** (ícone de engrenagem)
   → **API**. Anote:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (uma chave longa)

   Você vai usar essas duas informações na Parte 3.

---

## Parte 2 — Subir o projeto para o GitHub

1. Acesse **https://github.com** e crie um repositório novo (botão **New**),
   por exemplo `painel-contratos`. Pode deixar **Private** se quiser (o GitHub
   Pages funciona também em repositórios privados, dependendo do seu plano —
   se o seu plano não permitir Pages em repo privado, deixe **Public**; os
   dados sensíveis continuam protegidos porque ficam no Supabase, não no
   código).
2. No seu computador, baixe e descompacte o arquivo `painel-contratos.zip`
   que a Claude gerou (leia a Parte 4 abaixo se precisar).
3. Envie os arquivos para o GitHub. A forma mais simples, direto no site:
   - No repositório vazio, clique em "**uploading an existing file**"
   - Arraste TODOS os arquivos e pastas descompactados (incluindo a pasta
     oculta `.github`) e confirme o commit.
   - Alternativa (mais confiável para pastas ocultas como `.github`): use o
     Git no terminal:
     ```bash
     cd painel-contratos
     git init
     git add .
     git commit -m "primeiro commit"
     git branch -M main
     git remote add origin https://github.com/SEU-USUARIO/painel-contratos.git
     git push -u origin main
     ```

---

## Parte 3 — Configurar as chaves do Supabase no GitHub

1. No repositório, vá em **Settings** → **Secrets and variables** → **Actions**.
2. Clique **New repository secret** e crie:
   - Nome: `VITE_SUPABASE_URL` → valor: a **Project URL** que você anotou.
   - Nome: `VITE_SUPABASE_ANON_KEY` → valor: a **anon public key** que você anotou.

---

## Parte 4 — Ativar o GitHub Pages

1. No repositório, **Settings** → **Pages**.
2. Em "**Build and deployment**" → **Source**, selecione **GitHub Actions**.
3. Vá em **Settings** → **Actions** → **General** → em "Workflow permissions"
   marque **Read and write permissions** (garante que o deploy funcione).
4. Vá na aba **Actions** do repositório. Você deve ver o workflow
   "**Deploy site**" rodando (ele dispara sozinho a cada push). Espere
   terminar (ícone verde ✓).
5. Volte em **Settings → Pages** — vai aparecer o link do seu site, algo como:
   `https://SEU-USUARIO.github.io/painel-contratos/`

Pronto! Esse link funciona em qualquer dispositivo — computador, celular,
tablet. Faça login com o e-mail/senha que você criou no passo 7 da Parte 1.

---

## Importar contrato (upload de PDF/foto)

Na tela **Contratos**, o botão **Importar contrato** permite enviar um PDF ou
uma foto do contrato. O site lê o texto sozinho, direto no navegador:

- PDF com texto selecionável → lido diretamente.
- PDF escaneado ou foto → lido via OCR (reconhecimento de texto em imagem),
  usando a biblioteca Tesseract.js — tudo local, sem enviar o arquivo para
  nenhum servidor externo.

Depois, o sistema procura por padrões (datas, valores em R$, número do
contrato, CPF/CNPJ) e abre o formulário de contrato já preenchido com esses
"palpites" — mas **nada é salvo automaticamente**: você sempre revisa e
corrige antes de confirmar. Como é um reconhecimento por padrões (não uma
IA lendo o sentido do documento), pode errar — principalmente em fotos de
baixa qualidade ou contratos em formato incomum. Quanto mais nítido o
arquivo, melhor o resultado.

Essa função não precisa de nenhuma chave de API nem configuração extra —
já funciona assim que o site é publicado.

---

## Rodando localmente (opcional, para testar antes de publicar)

Requer [Node.js](https://nodejs.org) instalado.

```bash
cd painel-contratos
cp .env.example .env
# edite o .env e cole sua URL e chave do Supabase
npm install
npm run dev
```

Abre em `http://localhost:5173`.

---

## Perguntas comuns

**Os dados ficam visíveis para qualquer pessoa na internet?**
Não. As tabelas têm "Row Level Security" ativado — só quem faz login (sua
conta) consegue ler ou escrever. O código do site é público (se o repositório
for público), mas os dados ficam só no banco, protegidos por login.

**Posso ter mais de uma pessoa usando?**
Sim — crie mais usuários em Supabase → Authentication → Users. Todos que
tiverem login e senha válidos veem os mesmos dados (não há separação por
usuário nesta versão).

**Quanto custa?**
Supabase e GitHub Pages têm planos gratuitos generosos, suficientes para este
uso (poucos usuários, ~1000–2000 registros). Se crescer muito, o Supabase tem
planos pagos.

**Como faço backup?**
No Supabase: Table Editor → cada tabela → menu **Export** → CSV. Ou
Database → Backups (planos pagos têm backup automático).
