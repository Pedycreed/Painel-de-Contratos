import React, { useState } from "react";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";
import { extractTextFromFile, guessContractFields } from "./lib/extract";

const T = {
  ink: "#12212F",
  inkSoft: "#3C5169",
  paperRaised: "#FFFFFF",
  line: "#E1E3DD",
  amber: "#C7891A",
  amberBg: "#FBF0DC",
  red: "#B3402F",
};
const FONT_DISPLAY = "'Iowan Old Style', 'Palatino Linotype', Georgia, serif";

/**
 * Modal para o usuário enviar um PDF ou foto de contrato. O texto é extraído
 * (e, se necessário, lido via OCR) inteiramente no navegador — nenhum dado
 * sai do site. Os campos identificados são só um rascunho: onExtracted
 * recebe o resultado e quem decide o que fazer com ele é o componente pai
 * (normalmente abrindo o formulário de contrato já preenchido, para revisão).
 */
export default function ImportContractModal({ clients, onExtracted, onClose }) {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | working | error
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 15 * 1024 * 1024) {
      setError("Arquivo muito grande (máx. 15MB).");
      return;
    }
    setError("");
    setFile(f);
  }

  async function handleAnalyze() {
    if (!file) return;
    setStatus("working");
    setError("");
    setStatusMsg("Lendo arquivo…");
    setProgress(0);
    try {
      const { text, method, note } = await extractTextFromFile(file, (p) => {
        setStatusMsg(`Reconhecendo texto (OCR)… ${p}%`);
        setProgress(p);
      });
      if (!text || text.trim().length < 10) {
        throw new Error("Não consegui encontrar texto legível neste arquivo. Tente uma foto mais nítida ou um PDF com melhor qualidade.");
      }
      const fields = guessContractFields(text, clients);
      onExtracted({ fields, rawText: text, method, note });
    } catch (err) {
      setError(err.message || "Não foi possível ler o arquivo.");
      setStatus("error");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(18,33,47,0.45)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-xl shadow-2xl" style={{ backgroundColor: T.paperRaised }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: T.line }}>
          <h3 className="text-lg" style={{ fontFamily: FONT_DISPLAY, color: T.ink }}>
            Importar contrato
          </h3>
          <p className="text-xs mt-1" style={{ color: T.inkSoft }}>
            Envie um PDF ou uma foto. A leitura é feita aqui no seu navegador — nada é enviado para fora do site.
          </p>
        </div>

        <div className="p-6">
          <label
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg py-8 cursor-pointer"
            style={{ borderColor: T.line }}
          >
            <Upload size={22} color={T.inkSoft} />
            <span className="text-sm" style={{ color: T.inkSoft }}>
              {file ? file.name : "Clique para escolher um arquivo"}
            </span>
            <span className="text-[11px]" style={{ color: T.inkSoft }}>
              PDF, JPG ou PNG
            </span>
            <input type="file" accept=".pdf,image/png,image/jpeg" className="hidden" onChange={handleFile} />
          </label>

          {error && (
            <div className="flex items-start gap-2 mt-4 text-xs px-3 py-2 rounded-md" style={{ backgroundColor: "#F8E4DF", color: T.red }}>
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {status === "working" && (
            <div className="flex items-center gap-2 mt-4 text-xs" style={{ color: T.inkSoft }}>
              <Loader2 size={14} className="animate-spin" />
              {statusMsg}
            </div>
          )}

          <p className="text-[11px] mt-4 leading-relaxed" style={{ color: T.inkSoft }}>
            A leitura é automática e pode errar — na próxima tela você confere e corrige todos os campos antes de salvar.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: T.line }}>
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm font-medium border" style={{ borderColor: T.line, color: T.inkSoft }}>
            Cancelar
          </button>
          <button
            onClick={handleAnalyze}
            disabled={!file || status === "working"}
            className="px-4 py-2 rounded-md text-sm font-medium text-white flex items-center gap-1.5 disabled:opacity-50"
            style={{ backgroundColor: T.ink }}
          >
            <FileText size={14} />
            Analisar contrato
          </button>
        </div>
      </div>
    </div>
  );
}
