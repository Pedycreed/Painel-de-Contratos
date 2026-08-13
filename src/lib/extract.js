import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";

// Worker do pdf.js carregado via CDN (evita dor de cabeça de bundling no Vite).
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

/**
 * Extrai texto de um PDF "digital" (com camada de texto).
 * Retorna string vazia se o PDF não tiver texto (ex: escaneado).
 */
async function extractTextFromPdf(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let text = "";
  const maxPages = Math.min(pdf.numPages, 6); // limite razoável
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(" ") + "\n";
  }
  return text.trim();
}

/**
 * Renderiza a primeira página de um PDF como imagem (canvas), para o caso
 * de ser um PDF escaneado (sem texto selecionável).
 */
async function renderFirstPageToCanvas(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 2.2 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

/** OCR de uma imagem (arquivo, canvas ou blob) usando Tesseract.js, em português. */
async function ocrImage(source, onProgress) {
  const worker = await createWorker("por", 1, {
    logger: (m) => {
      if (onProgress && m.status === "recognizing text") onProgress(Math.round(m.progress * 100));
    },
  });
  const {
    data: { text },
  } = await worker.recognize(source);
  await worker.terminate();
  return text;
}

/**
 * Função principal: recebe um File (PDF, JPG ou PNG) e devolve o texto bruto
 * extraído, usando texto nativo do PDF quando existir, ou OCR como fallback.
 */
export async function extractTextFromFile(file, onProgress) {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const buf = await file.arrayBuffer();
    const nativeText = await extractTextFromPdf(buf.slice(0));
    if (nativeText.length > 60) {
      return { text: nativeText, method: "pdf-texto" };
    }
    // PDF provavelmente escaneado: renderiza 1ª página e faz OCR
    const canvas = await renderFirstPageToCanvas(buf.slice(0));
    const text = await ocrImage(canvas, onProgress);
    return { text, method: "ocr-pdf-imagem", note: "PDF escaneado: apenas a 1ª página foi lida via OCR." };
  }

  // Imagem (foto do contrato)
  const text = await ocrImage(file, onProgress);
  return { text, method: "ocr-imagem" };
}

const MESES = {};

function parseMoneyToken(tok) {
  // "1.234,56" -> 1234.56
  const cleaned = tok.replace(/[R$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function ddmmyyyyToIso(d, m, y) {
  const dd = d.padStart(2, "0");
  const mm = m.padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

/**
 * Analisa o texto extraído e tenta adivinhar os campos do contrato.
 * Tudo aqui é heurístico (regex) — o usuário revisa e corrige no formulário.
 */
export function guessContractFields(text, clients) {
  const result = {
    numero: "",
    clientId: "",
    contratanteLabel: "",
    descricao: "",
    valorContrato: 0,
    dataAssinatura: "",
    dataInicioVigencia: "",
    dataVencimento: "",
    matchedCpfCnpj: "",
  };

  // Número do contrato
  const numMatch = text.match(/n[ºo°]\.?\s*[:\-]?\s*(\d{4,})/i) || text.match(/contrato\s*[:\-]?\s*(\d{4,})/i);
  if (numMatch) result.numero = numMatch[1];

  // Valores em R$
  const valueMatches = [...text.matchAll(/R\$\s?[\d.]{1,12},\d{2}/g)].map((m) => parseMoneyToken(m[0])).filter((v) => v !== null && v > 0);
  if (valueMatches.length) result.valorContrato = Math.max(...valueMatches);

  // Datas dd/mm/yyyy
  const dateMatches = [...text.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)]
    .map((m) => ddmmyyyyToIso(m[1], m[2], m[3]))
    .filter((iso) => !isNaN(new Date(iso).getTime()));
  const uniqueDates = [...new Set(dateMatches)].sort();
  if (uniqueDates.length === 1) {
    result.dataVencimento = uniqueDates[0];
  } else if (uniqueDates.length === 2) {
    result.dataAssinatura = uniqueDates[0];
    result.dataVencimento = uniqueDates[1];
  } else if (uniqueDates.length >= 3) {
    result.dataAssinatura = uniqueDates[0];
    result.dataInicioVigencia = uniqueDates[1];
    result.dataVencimento = uniqueDates[uniqueDates.length - 1];
  }

  // CPF/CNPJ -> tenta casar com cliente já cadastrado
  const cpfCnpjMatch = text.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}|\d{3}\.\d{3}\.\d{3}-\d{2}/);
  if (cpfCnpjMatch) {
    result.matchedCpfCnpj = cpfCnpjMatch[0];
    const found = clients.find((c) => (c.cpfCnpj || "").replace(/\D/g, "") === cpfCnpjMatch[0].replace(/\D/g, ""));
    if (found) {
      result.clientId = found.id;
      result.contratanteLabel = found.nomeUnico;
    }
  }

  return result;
}
