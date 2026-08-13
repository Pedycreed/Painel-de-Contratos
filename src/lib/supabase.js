import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Isso aparece no console do navegador se as variáveis de ambiente
  // não foram configuradas (veja o README).
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não configuradas. Crie um arquivo .env (local) ou configure os Secrets do GitHub Actions (produção)."
  );
}

export const supabase = createClient(url, anonKey);
