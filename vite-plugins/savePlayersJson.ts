import fs from "node:fs";
import path from "node:path";
import type { Connect, PreviewServer, ViteDevServer } from "vite";

function attachHandler(middlewares: Connect.Server, apiPath: string, targetFile: string, arrayKey: "players" | "matches") {
  middlewares.use(apiPath, (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        const data: unknown = JSON.parse(raw);
        if (!data || typeof data !== "object" || !Array.isArray((data as Record<string, unknown>)[arrayKey])) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`JSON invalide : tableau « ${arrayKey} » attendu.`);
          return;
        }
        const dir = path.dirname(targetFile);
        if (!fs.existsSync(dir)) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`Répertoire introuvable : ${dir}`);
          return;
        }
        fs.writeFileSync(targetFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(e instanceof Error ? e.message : "Erreur serveur");
      }
    });
  });
}

/** En dev : écrit `public/data/players.json`. En preview : écrit `dist/data/players.json`. */
export function savePlayersJsonPlugin(rootDir: string) {
  const devFile = path.join(rootDir, "public", "data", "players.json");
  const previewFile = path.join(rootDir, "dist", "data", "players.json");
  const devMatchesFile = path.join(rootDir, "public", "data", "matches.json");
  const previewMatchesFile = path.join(rootDir, "dist", "data", "matches.json");
  const devScoringFile = path.join(rootDir, "public", "data", "scoring-config.json");
  const previewScoringFile = path.join(rootDir, "dist", "data", "scoring-config.json");

  return {
    name: "save-players-json",
    configureServer(server: ViteDevServer) {
      attachHandler(server.middlewares, "/api/save-players", devFile, "players");
      attachHandler(server.middlewares, "/api/save-matches", devMatchesFile, "matches");
      attachScoringConfigHandler(server.middlewares, "/api/save-scoring-config", devScoringFile);
    },
    configurePreviewServer(server: PreviewServer) {
      attachHandler(server.middlewares, "/api/save-players", previewFile, "players");
      attachHandler(server.middlewares, "/api/save-matches", previewMatchesFile, "matches");
      attachScoringConfigHandler(server.middlewares, "/api/save-scoring-config", previewScoringFile);
    },
  };
}

function attachScoringConfigHandler(middlewares: Connect.Server, apiPath: string, targetFile: string) {
  middlewares.use(apiPath, (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        const data: unknown = JSON.parse(raw);
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end("JSON invalide : objet attendu.");
          return;
        }
        for (const v of Object.values(data as Record<string, unknown>)) {
          if (typeof v !== "number" || !Number.isFinite(v)) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end("JSON invalide : toutes les valeurs doivent être des nombres.");
            return;
          }
        }
        const dir = path.dirname(targetFile);
        if (!fs.existsSync(dir)) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end(`Répertoire introuvable : ${dir}`);
          return;
        }
        fs.writeFileSync(targetFile, `${JSON.stringify(data, null, 2)}\n`, "utf8");
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(e instanceof Error ? e.message : "Erreur serveur");
      }
    });
  });
}
