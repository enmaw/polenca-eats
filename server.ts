import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

let projectId = "gen-lang-client-0571548154"; // Fallback to current project
try {
  const configContent = fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf-8");
  const config = JSON.parse(configContent);
  if (config.projectId) {
    projectId = config.projectId;
  }
} catch (e) {
  console.warn("Could not read firebase-applet-config.json, using default projectId");
}

// Ensure we don't use the injected env var if it's actually an appId or incorrectly formatted
const finalProjectId = projectId !== "gen-lang-client-0571548154" 
  ? projectId 
  : (process.env.FIREBASE_PROJECT_ID || projectId);

initializeApp({
  projectId: finalProjectId
});

// Developed by https://github.com/enmaw

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Servidor roda atrás de um proxy reverso (hospedagem pública). Confiar só
  // no primeiro "hop" evita que um cliente malicioso falsifique o próprio IP
  // via header X-Forwarded-For para burlar o rate limit abaixo.
  app.set("trust proxy", 1);

  // Cabeçalhos de segurança padrão (esconde X-Powered-By, HSTS, etc.)
  app.use(helmet({
    contentSecurityPolicy: false, // o front-end define seus próprios recursos externos (fonts, etc.)
  }));

  // Limite geral de tamanho de corpo em todas as rotas JSON, por segurança.
  app.use(express.json({ limit: "100kb" }));

  // Use raw body for overpass query forwarding. Limite pequeno: uma query
  // Overpass legítima gerada pelo app tem poucos KB.
  app.use('/api/overpass', express.text({ type: '*/*', limit: '10kb' }));

  // Limita quantas buscas cada IP pode fazer, pra não sobrecarregar nem o
  // nosso servidor nem os servidores públicos do OpenStreetMap/Overpass
  // (e evitar que a hospedagem pública seja usada como proxy aberto).
  const overpassLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 15,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Muitas buscas em pouco tempo. Espere um minuto e tente de novo." },
  });
  app.use('/api/overpass', overpassLimiter);

  // API route for Overpass proxy
  app.post("/api/overpass", async (req, res) => {
    // 1. Verify Authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized: Missing token" });
    }
    const token = authHeader.split('Bearer ')[1];
    try {
      await getAuth().verifyIdToken(token);
    } catch (e) {
      console.error("Token verification failed:", e);
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    const query = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Missing query" });
    }

    // Trava de sanidade: a maior query que o app gera é curta. Isso evita
    // que alguém explore o endpoint pra mandar corpos gigantes através do
    // nosso servidor para os servidores do Overpass.
    if (query.length > 4000) {
      return res.status(413).json({ error: "Query too large" });
    }

    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://lz4.overpass-api.de/api/interpreter',
      'https://z.overpass-api.de/api/interpreter',
      'https://overpass.openstreetmap.ru/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter'
    ];

    let successData = null;
    let errors = [];

    for (const endpoint of endpoints) {
      try {
        const urlEncodedBody = `data=${encodeURIComponent(query)}`;
        const response = await axios.post(endpoint, urlEncodedBody, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'NossoRoleApp/1.0 (github-opensource-version)'
          },
          timeout: 20000,
          responseType: 'json'
        });
        
        const data = response.data;
        
        if (!data || !data.elements) {
          throw new Error(`Missing elements in response from ${endpoint}`);
        }

        if (data.remark && data.remark.toLowerCase().includes('error')) {
          throw new Error(`Overpass error from ${endpoint}: ${data.remark}`);
        }
        
        successData = data;
        break; // Successfully fetched, break the loop
      } catch (err: any) {
        // Collect error message
        const errMsg = err.response ? `Request failed with status code ${err.response.status}` : err.message;
        errors.push(errMsg);
        console.warn(`Failed endpoint ${endpoint}:`, errMsg);
        // Continue to the next endpoint
      }
    }

    if (successData) {
      res.json(successData);
    } else {
      console.warn("Overpass proxy exhausted all endpoints. Typical during high load or timeouts:", errors);
      res.status(502).json({ error: "All OpenStreetMap servers failed or are overloaded.", details: errors });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
