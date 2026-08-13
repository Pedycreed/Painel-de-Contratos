import React, { useState } from "react";
import { supabase } from "./lib/supabase";

const T = { ink: "#12212F", inkSoft: "#3C5169", paper: "#F5F6F2", line: "#E1E3DD", red: "#B3402F" };
const FONT_DISPLAY = "'Iowan Old Style', 'Palatino Linotype', Georgia, serif";

export default function Login() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("Conta criada. Verifique seu e-mail para confirmar (se a confirmação estiver ativada) e depois faça login.");
      }
    } catch (err) {
      setError(err.message || "Erro ao autenticar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center h-screen" style={{ backgroundColor: T.paper }}>
      <form onSubmit={handleSubmit} className="w-full max-w-sm p-8 rounded-xl border" style={{ backgroundColor: "#fff", borderColor: T.line }}>
        <h1 className="text-2xl mb-1" style={{ fontFamily: FONT_DISPLAY, color: T.ink }}>
          Painel de Contratos
        </h1>
        <p className="text-sm mb-6" style={{ color: T.inkSoft }}>
          {mode === "signin" ? "Entre com sua conta." : "Crie sua conta de acesso."}
        </p>

        <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: T.inkSoft }}>
          E-mail
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 mb-4 rounded-md border text-sm outline-none"
          style={{ borderColor: T.line }}
        />

        <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: T.inkSoft }}>
          Senha
        </label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 mb-4 rounded-md border text-sm outline-none"
          style={{ borderColor: T.line }}
        />

        {error && (
          <p className="text-xs mb-3" style={{ color: T.red }}>
            {error}
          </p>
        )}
        {info && (
          <p className="text-xs mb-3" style={{ color: T.inkSoft }}>
            {info}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-md text-sm font-medium text-white mb-3 disabled:opacity-60"
          style={{ backgroundColor: T.ink }}
        >
          {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError("");
            setInfo("");
          }}
          className="w-full text-xs"
          style={{ color: T.inkSoft }}
        >
          {mode === "signin" ? "Ainda não tem conta? Criar uma" : "Já tem conta? Entrar"}
        </button>
      </form>
    </div>
  );
}
