import type { Config, Context } from "@netlify/functions";
import axios from "axios";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import path from "path";

// Mesma lógica de detecção de projectId usada em server.ts (dev local).
function resolveProjectId(): string {
  const fallback = "gen-lang-client-0571548154";
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const configContent = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(configContent);
    if (config.projectId) return config.projectId;
  } catch {
    // Segue para os fallbacks abaixo.
  }
  return process.env.FIREBASE_PROJECT_ID || fallback;
}

if (getApps().length === 0) {
  initializeApp({ projectId: resolveProjectId() });
}

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://lz4.overpass-api.de/api/interpreter",
  "https://z.overpass-api.de/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// Classifica o erro pra deixar claro se foi rejeição de rede (ex: mirror
// bloqueando IP de datacenter), timeout, ou erro HTTP do próprio Overpass.
function describeError(err: any): string {
  if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
    return "timeout";
  }
  if (err.code) return err.code; // ECONNREFUSED, ENOTFOUND, ETIMEDOUT, etc.
  if (err.response) return `HTTP ${err.response.status}`;
  return err.message ?? "unknown error";
}

// Faz uma tentativa contra um endpoint, com até `retries` novas tentativas
// em caso de erro transitório (rede, timeout, 429/502/503/504). Backoff
// exponencial curto pra não estourar o timeout total da function.
async function fetchOverpass(endpoint: string, query: string, retries = 1): Promise<unknown> {
  const urlEncodedBody = `data=${encodeURIComponent(query)}`;
  let lastError: any;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(endpoint, urlEncodedBody, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          "User-Agent": "NossoRoleApp/1.0 (github-opensource-version)",
        },
        timeout: 8000,
        responseType: "json",
      });

      const data = response.data;
      if (!data || !data.elements) {
        throw new Error(`Missing elements in response from ${hostnameOf(endpoint)}`);
      }
      if (data.remark && data.remark.toLowerCase().includes("error")) {
        throw new Error(`Overpass error from ${hostnameOf(endpoint)}: ${data.remark}`);
      }
      return data;
    } catch (err: any) {
      lastError = err;
      const status = err?.response?.status;
      const isRetryable =
        !status || status === 429 || status === 502 || status === 503 || status === 504;

      if (attempt < retries && isRetryable) {
        const backoffMs = 300 * Math.pow(2, attempt); // 300ms, 600ms, ...
        await sleep(backoffMs);
        continue;
      }
      break;
    }
  }

  const reason = describeError(lastError);
  const wrapped = new Error(`${hostnameOf(endpoint)}: ${reason}`);
  (wrapped as any).endpoint = endpoint;
  (wrapped as any).reason = reason;
  throw wrapped;
}

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // 1. Verifica autenticação (mesma checagem que existia no server.ts)
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return json({ error: "Unauthorized: Missing token" }, 401);
  }
  const token = authHeader.slice("Bearer ".length);
  try {
    await getAuth().verifyIdToken(token);
  } catch (e) {
    console.error("Token verification failed:", e);
    return json({ error: "Unauthorized: Invalid token" }, 401);
  }

  const query = await req.text();
  if (!query) {
    return json({ error: "Missing query" }, 400);
  }

  // Trava de sanidade: a maior query que o app gera é curta.
  if (query.length > 4000) {
    return json({ error: "Query too large" }, 413);
  }

  let successData: unknown = null;
  const errors: string[] = [];

  // Tenta todos os espelhos do Overpass em paralelo (o primeiro que responder
  // com sucesso "ganha"), em vez de um por vez. Isso evita que a soma dos
  // timeouts individuais estoure o limite de execução da function. Cada
  // endpoint ainda tem 1 retry interno pra erros transitórios (rede/429/5xx).
  const attempts = ENDPOINTS.map((endpoint) => fetchOverpass(endpoint, query, 1));

  try {
    successData = await Promise.any(attempts);
  } catch (aggregateError: any) {
    const reasons: Error[] = aggregateError?.errors ?? [];
    for (const err of reasons) {
      const msg = err?.message ?? String(err);
      errors.push(msg);
      console.warn("Endpoint falhou:", msg);
    }
  }

  if (successData) {
    return json(successData);
  }

  // Se TODOS os endpoints falharam com erro de rede (sem status HTTP nenhum),
  // é forte indício de que os mirrors públicos estão bloqueando/limitando o
  // IP de datacenter da Netlify Function, e não um problema no nosso código.
  const allNetworkErrors = errors.every(
    (e) => /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|timeout|ECONNRESET/i.test(e)
  );

  console.warn("Overpass proxy exhausted all endpoints:", errors);
  return json(
    {
      error: allNetworkErrors
        ? "Não conseguimos alcançar nenhum servidor do OpenStreetMap agora (possível bloqueio de IP de datacenter pelos mirrors públicos)."
        : "Todos os servidores do OpenStreetMap falharam ou estão sobrecarregados.",
      details: errors,
    },
    502
  );
};

export const config: Config = {
  path: "/api/overpass",
  // Limita buscas por IP pra não sobrecarregar nem o nosso site nem os
  // servidores públicos do OpenStreetMap/Overpass.
  rateLimit: {
    windowLimit: 15,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
