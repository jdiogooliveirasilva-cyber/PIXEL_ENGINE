// =============================================================
// Pixel Engine 2D — Servidor Multiplayer (v6.3.0)
// =============================================================
// HTTP estático (serve index.html + assets) + WebSocket (sala/broadcast).
// Compatível com Replit: usa process.env.PORT, escuta em 0.0.0.0,
// e o cliente conecta no MESMO host com wss:// quando estiver em https.
//
// Estrutura de mensagem (cliente <-> servidor):
//   { type, room, playerId, data }
//
// Tipos enviados pelo cliente:
//   "join"    — entrar/criar uma sala (msg.room)
//   "leave"   — sair da sala atual
//   "sync"    — sincronizar posição (msg.data = {srcId,x,y})
//   "message" — mensagem livre (msg.data = {msg:"..."})
//
// Tipos enviados pelo servidor:
//   "welcome" — assina um playerId único na conexão
//   "joined"  — confirmação local da entrada (com peers atuais)
//   "join"    — broadcast: outro jogador entrou na sala
//   "leave"   — broadcast: outro jogador saiu/desconectou
//   (qualquer outro tipo enviado por um cliente é repassado para
//    os outros jogadores da MESMA SALA)
// =============================================================

"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { WebSocketServer } = require("ws");

// -------------------------------------------------------------
// CONFIGURAÇÃO — usa o PORT que o Replit injeta automaticamente.
// -------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";
const ROOT = __dirname;

// MIME types mínimos pro engine (HTML é o principal).
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".webp": "image/webp",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".mp3":  "audio/mpeg",
  ".ogg":  "audio/ogg",
  ".wav":  "audio/wav",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".txt":  "text/plain; charset=utf-8",
  ".md":   "text/markdown; charset=utf-8"
};

// -------------------------------------------------------------
// HTTP — serve index.html e arquivos estáticos da pasta atual.
// -------------------------------------------------------------
const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (urlPath === "/" || urlPath === "") urlPath = "/index.html";

  // Resolve dentro de ROOT e bloqueia path traversal (..).
  const safeRel = path.normalize(urlPath).replace(/^([/\\])+/, "");
  const filePath = path.join(ROOT, safeRel);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); return res.end("Forbidden");
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("404 — arquivo não encontrado");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      // Cache curto pra HTML (facilita atualizar a engine), longo pra mídia.
      "Cache-Control": ext === ".html" ? "no-cache" : "public, max-age=3600"
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

// -------------------------------------------------------------
// WebSocket — anexado ao mesmo HTTP server (mesma porta).
// -------------------------------------------------------------
const wss = new WebSocketServer({ server });

// rooms: Map<roomName, Set<ws>>
const rooms = new Map();
let nextPlayerSeq = 1;

function makePlayerId() {
  return "p_" + (nextPlayerSeq++).toString(36) + "_" +
         Math.random().toString(36).slice(2, 7);
}

function safeSend(ws, obj) {
  try {
    if (ws.readyState === 1 /* OPEN */) ws.send(JSON.stringify(obj));
  } catch (_) { /* ignora — ws pode ter fechado entre o readyState e o send */ }
}

function broadcast(roomName, msg, exceptWs) {
  const r = rooms.get(roomName);
  if (!r) return;
  for (const c of r) {
    if (c !== exceptWs) safeSend(c, msg);
  }
}

function leaveRoom(ws) {
  if (!ws.room) return;
  const r = rooms.get(ws.room);
  if (r) {
    r.delete(ws);
    broadcast(ws.room, { type: "leave", room: ws.room, playerId: ws.playerId });
    if (r.size === 0) rooms.delete(ws.room);
  }
  ws.room = null;
}

wss.on("connection", (ws, req) => {
  ws.playerId = makePlayerId();
  ws.room = null;
  ws.isAlive = true;

  // Saudação — o cliente já passa a saber o próprio ID antes de entrar
  // em qualquer sala (útil para evitar processar o próprio echo).
  safeSend(ws, { type: "welcome", playerId: ws.playerId });

  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); }
    catch { return; /* mensagem inválida, ignora */ }
    if (!msg || typeof msg !== "object" || !msg.type) return;

    // Carimba o playerId DO SERVIDOR (não confia no cliente).
    msg.playerId = ws.playerId;

    switch (msg.type) {
      case "join": {
        const room = String(msg.room || "default").slice(0, 64);
        if (ws.room === room) return; // já está na sala
        leaveRoom(ws);
        if (!rooms.has(room)) rooms.set(room, new Set());
        rooms.get(room).add(ws);
        ws.room = room;
        // Confirma para quem entrou + lista os outros já presentes.
        const peers = [...rooms.get(room)]
          .filter(c => c !== ws)
          .map(c => c.playerId);
        safeSend(ws, { type: "joined", room, playerId: ws.playerId, peers });
        // Avisa os outros que ele chegou.
        broadcast(room, { type: "join", room, playerId: ws.playerId }, ws);
        break;
      }

      case "leave":
        leaveRoom(ws);
        break;

      default: {
        // Qualquer outro tipo (sync, message, custom...) é repassado pra
        // própria sala — APENAS pra ela. O servidor não precisa entender
        // o conteúdo: o engine cliente é quem interpreta.
        if (ws.room) {
          // Garante que room sempre fica preenchido na mensagem.
          msg.room = ws.room;
          broadcast(ws.room, msg, ws);
        }
        // Se o cliente mandar algo sem entrar em sala, simplesmente ignora.
        break;
      }
    }
  });

  ws.on("close", () => { leaveRoom(ws); });
  ws.on("error", () => { /* swallow — close handler cuida da limpeza */ });
});

// Heartbeat — derruba conexões mortas (sem pong há 60s) e libera a sala.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      try { ws.terminate(); } catch (_) {}
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (_) {}
  }
}, 30000);

wss.on("close", () => clearInterval(heartbeat));

// -------------------------------------------------------------
// START
// -------------------------------------------------------------
server.listen(PORT, HOST, () => {
  console.log("Pixel Engine 2D Multiplayer Server");
  console.log("HTTP + WebSocket: http://" + HOST + ":" + PORT);
  console.log("Abra a URL no navegador (ou compartilhe com outro jogador!).");
});

// Encerramento limpo (Ctrl+C / SIGTERM no Replit).
function shutdown() {
  console.log("Encerrando servidor...");
  for (const ws of wss.clients) { try { ws.close(); } catch (_) {} }
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
