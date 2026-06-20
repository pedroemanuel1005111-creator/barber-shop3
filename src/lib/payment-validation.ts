import { createWorker } from "tesseract.js";

type ValidationInput = {
  receiptDataUrl: string;
  pixKey: string;
  expectedAmountCents: number;
  referenceCode: string;
  transactionId: string;
};

export type ValidationResult = {
  status: "validated" | "manual_review" | "ocr_failed";
  score: number;
  summary: string;
  extractedText: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeAlphaNumeric(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function buildAmountPatterns(amountCents: number) {
  const amount = (amountCents / 100).toFixed(2);
  const comma = amount.replace(".", ",");
  const compact = amount.replace(".", "");
  const whole = String(Math.round(amountCents / 100));
  return [amount, comma, compact, whole];
}

async function extractTextFromReceipt(receiptDataUrl: string): Promise<string> {
  const base64 = receiptDataUrl.includes(",")
    ? receiptDataUrl.split(",")[1]
    : receiptDataUrl;
  const buffer = Buffer.from(base64, "base64");

  const worker = await createWorker("eng", 1, {
    workerPath: undefined,
    langPath: undefined,  
    gzip: false,
  });

  try {
    const result = await worker.recognize(buffer);
    return result.data.text || "";
  } finally {
    await worker.terminate();
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

function scoreReceipt(
  extractedText: string,
  pixKey: string,
  expectedAmountCents: number,
  referenceCode: string,
  transactionId: string
) {
  const normalizedText = normalizeText(extractedText);
  const normalizedAlphaNumeric = normalizeAlphaNumeric(extractedText);
  const normalizedDigits = digitsOnly(extractedText);

  let score = 0;
  const reasons: string[] = [];
  const failures: string[] = [];

  const amountFound = buildAmountPatterns(expectedAmountCents).some((pattern) =>
    normalizedText.includes(pattern.toLowerCase()) || normalizedDigits.includes(digitsOnly(pattern))
  );

  if (amountFound) {
    score += 20;
    reasons.push("valor da taxa encontrado");
  } else {
    failures.push("o valor não apareceu claramente no comprovante");
  }

  const pixDigits = digitsOnly(pixKey);
  const pixFound = normalizedDigits.includes(pixDigits);
  if (pixFound) {
    score += 25;
    reasons.push("chave PIX confirmada");
  } else {
    failures.push("chave PIX não encontrada no comprovante");
  }

  const normalizedReferenceCode = normalizeAlphaNumeric(referenceCode);
  const referenceFound = normalizedAlphaNumeric.includes(normalizedReferenceCode);
  if (referenceFound) {
    score += 30;
    reasons.push("código único da barbearia localizado");
  } else {
    failures.push("código único da barbearia não apareceu no comprovante");
  }

  const normalizedTransactionId = normalizeAlphaNumeric(transactionId);
  const transactionTail = normalizedTransactionId.slice(-8);
  const transactionFound =
    normalizedAlphaNumeric.includes(normalizedTransactionId) ||
    (transactionTail.length >= 6 && normalizedAlphaNumeric.includes(transactionTail));

  if (transactionFound) {
    score += 15;
    reasons.push("ID da transação compatível");
  } else {
    failures.push("o TxID informado não bate com o texto do comprovante");
  }

  const keywordGroups = [
    ["pix", "comprovante"],
    ["transferencia", "pagamento", "enviado", "realizado", "concluido"],
    ["banco", "nubank", "itau", "bradesco", "caixa", "inter", "mercado"],
  ];

  let keywordMatches = 0;
  for (const group of keywordGroups) {
    if (group.some((keyword) => normalizedText.includes(keyword))) {
      keywordMatches += 1;
    }
  }

  if (keywordMatches >= 1) {
    score += 10;
    reasons.push("termos típicos de comprovante encontrados");
  } else {
    failures.push("não foram detectados termos comuns de recibo bancário");
  }

  const validated = amountFound && pixFound && referenceFound && transactionFound && score >= 80;

  return {
    validated,
    score,
    reasons,
    failures,
  };
}

export async function validatePaymentReceipt(input: ValidationInput): Promise<ValidationResult> {
  let extractedText = "";

  try {
    extractedText = await withTimeout(extractTextFromReceipt(input.receiptDataUrl), 20000);
  } catch {
    // OCR falhou ou timeout — não bloqueia o envio, vai pra análise manual
    return {
      status: "manual_review",
      score: 0,
      summary:
        "Não foi possível ler automaticamente o comprovante (timeout ou erro no OCR). O comprovante será analisado manualmente pela plataforma.",
      extractedText: "",
    };
  }

  if (!extractedText || extractedText.trim().length < 20) {
    // Texto muito curto — provavelmente imagem ilegível
    return {
      status: "manual_review",
      score: 0,
      summary:
        "O texto extraído do comprovante ficou muito curto ou vazio. O comprovante será analisado manualmente pela plataforma.",
      extractedText: extractedText.slice(0, 4000),
    };
  }

  const { validated, score, reasons, failures } = scoreReceipt(
    extractedText,
    input.pixKey,
    input.expectedAmountCents,
    input.referenceCode,
    input.transactionId
  );

  if (validated) {
    return {
      status: "validated",
      score,
      summary: `Validação automática aprovada: ${reasons.join(", ")}.`,
      extractedText: extractedText.slice(0, 4000),
    };
  }

  // Não passou, mas teve OCR — vai pra análise manual
  return {
    status: "manual_review",
    score,
    summary: `Validação automática encontrou inconsistências: ${failures.join("; ")}. O comprovante será revisado manualmente.`,
    extractedText: extractedText.slice(0, 4000),
  };
}
