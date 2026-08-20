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
  // timeouts individuais estoure o limite de execução da function.
  const attempts = ENDPOINTS.map(async (endpoint) => {
    const urlEncodedBody = `data=${encodeURIComponent(query)}`;
    const response = await axios.post(endpoint, urlEncodedBody, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": "NossoRoleApp/1.0 (github-opensource-version)",
      },
      timeout: 15000,
      responseType: "json",
    });

    const data = response.data;
    if (!data || !data.elements) {
      throw new Error(`Missing elements in response from ${endpoint}`);
    }
    if (data.remark && data.remark.toLowerCase().includes("error")) {
      throw new Error(`Overpass error from ${endpoint}: ${data.remark}`);
    }
    return data;
  });

  try {
    successData = await Promise.any(attempts);
  } catch (aggregateError: any) {
    const reasons: Error[] = aggregateError?.errors ?? [];
    for (const err of reasons) {
      const anyErr = err as any;
      const errMsg = anyErr.response
        ? `Request failed with status code ${anyErr.response.status}`
        : anyErr.message;
      errors.push(errMsg);
      console.warn("Endpoint falhou:", errMsg);
    }
  }

  if (successData) {
    return json(successData);
  }

  console.warn("Overpass proxy exhausted all endpoints:", errors);
  return json(
    { error: "All OpenStreetMap servers failed or are overloaded.", details: errors },
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
