# PixelEngine 2D — v6.3.0 (Multiplayer)

## ✨ Novo: Sistema multiplayer (opcional, à prova de offline)

Adicionado um sistema completo de multiplayer baseado em WebSocket
**sem quebrar nada** da engine existente.
Se o servidor não estiver disponível, **todas** as funcionalidades
de rede viram no-op silencioso e o jogo continua rodando offline
exatamente como na v6.2.2.

### Engine (`index.html`)
- Nova classe `NetworkManager` (dentro do IIFE da Engine), exposta como
  `Engine.Network` e `window.network`.
  - Auto-conexão lazy (na primeira chamada de `joinRoom`/`send`).
  - Auto-reconnect com backoff exponencial (1s → 2s → 4s → ... até 30s).
  - Detecta automaticamente `ws://` vs `wss://` pelo `location.protocol`,
    e usa `location.host` — funciona igual em local, Replit e produção.
  - Buffers por frame: `incomingMessages`, `joinEvents`, `leaveEvents`,
    drenados em `endFrame()` após cada `runEvents`.
- Nova função interna `_processNetworkSync(scene, runtime)`:
  - Para cada mensagem `sync` recebida, cria/atualiza um **clone remoto**
    do objeto local de mesmo `srcId` (mesmo sprite, mesmo tamanho).
  - Clones remotos têm `_remote = true` e física desligada — sua posição
    é controlada exclusivamente pela rede.
  - Eventos `leave` removem todos os clones do jogador que saiu.
- Loop integrado: `_processNetworkSync` é chamado antes do `runEvents`,
  e `Network.endFrame()` é chamado depois — sem race conditions.
- `runtime.netSyncSenders` faz throttle de envio em **33ms (~30fps)** por
  objeto, economizando banda.

### Editor (mesma `index.html`)
Nova categoria **MULTIPLAYER** nos menus de condições e ações,
seguindo o mesmo estilo visual (`menu-section` / `menu-item`) do resto:

**Condições**
- `net_event` — ao receber mensagem da rede (com filtro de texto opcional).
- `net_player_join` — quando outro jogador entra na sala.
- `net_player_leave` — quando outro jogador sai/desconecta.

**Ações**
- `net_create_room` / `net_join_room` — entra/cria sala (mesmo backend).
- `net_send` — envia mensagem livre pra sala.
- `net_sync_position` — sincroniza `x, y` do objeto (gera clones remotos).

### Servidor (`server.js`)
- HTTP estático **+** WebSocket no mesmo processo/porta
  (usa `process.env.PORT` — Replit ready).
- Sistema de salas: `Map<roomName, Set<conexão>>`.
- Broadcast estritamente escopado por sala (jogadores em salas diferentes
  nunca recebem mensagens uns dos outros).
- `playerId` único atribuído pelo servidor (cliente não pode forjar).
- Heartbeat ping/pong a cada 30s — derruba conexões mortas e libera salas.
- Encerramento limpo em SIGINT/SIGTERM.

### Compatibilidade
- ✅ Projetos antigos (v6.2.2) continuam funcionando sem alterações.
- ✅ Exportar HTML standalone continua funcionando — o jogo exportado
  roda sozinho. Multiplayer só ativa se hospedado em servidor compatível.
- ✅ Mobile (iOS Safari, Android Chrome) — WebSocket usa o mesmo
  host/porta do HTTP, sem problema de firewall.
- ✅ HTTPS automático em produção (`wss://`).

### Como rodar
```bash
npm install
npm start
# abra http://localhost:3000 (ou a URL pública do Replit)
```
