# PixelEngine2D v6.2.0 — Multiplayer WebSocket (Opcional)

Adição **PURAMENTE ADITIVA**: nada do engine v6.1.9 mudou. Render, input, física, sistema de eventos, behaviors, tween, save, exportação HTML — **idênticos**. O multiplayer é totalmente opcional: se você nunca tocar nele, o jogo roda 100% offline como antes.

---

## O que entrou

Um módulo `Network` rodando dentro do mesmo IIFE do engine (então é exportado tanto no preview quanto no HTML standalone via `buildStandaloneHTML`), mais 4 condições, 11 ações, 6 expressões e 2 categorias novas nos pickers do editor.

---

## 1. Categorias novas no editor

### Condições — "REDE — MULTIPLAYER"
- **Conectado ao servidor** — `net_connected`
- **Está em uma sala** — `net_in_room`
- **Sou o anfitrião (host)** — `net_is_host`
- **Quando evento de rede chegar** — `net_event` (com seletor: `connected`, `disconnected`, `room_joined`, `room_left`, `player_joined`, `player_left`, `data_received`, `state_received`, `input_received`)

### Ações — "REDE — MULTIPLAYER"
- **Conectar a servidor (URL ws://)** — `net_connect`
- **Desconectar** — `net_disconnect`
- **Criar sala** — `net_create_room`
- **Entrar em sala (ID)** — `net_join_room`
- **Sair da sala** — `net_leave_room`
- **Enviar input** — `net_send_input` (string ou número)
- **Enviar estado do objeto (agora)** — `net_send_state` (envia x/y/anim já)
- **Enviar dado custom (chave/valor)** — `net_send_data`
- **Marcar objeto como local (auto-envio)** — `net_set_local`
- **Desmarcar objeto como local** — `net_unset_local`
- **Definir intervalo de envio (s)** — `net_set_send_interval` (padrão 0.05s = 20Hz)

### Expressões (use no campo "Valor ou expressão" das ações)
- `NetworkConnected()`, `NetworkInRoom()`, `NetworkIsHost()` — retornam 0 ou 1
- `NetworkPlayerCount()` — quantos jogadores remotos conhecidos
- `NetworkPlayerX("id")`, `NetworkPlayerY("id")` — posição interpolada de outro jogador

---

## 2. Como usar (fluxo típico)

**Anfitrião:**
1. `Conectar a servidor (ws://meu-servidor:8080)`
2. Quando `Conectado ao servidor` for verdadeiro → `Criar sala`
3. Quando `Quando evento de rede chegar` (room_joined) → mostre o ID em um texto: `set_text` com `NetworkPlayerCount()` ou leia `network.roomId` direto do código
4. Marque o jogador local: `Marcar objeto como local` no `Player`
5. Quando `Quando evento de rede chegar` (player_joined) → criar uma cópia do `PlayerRemoto`

**Jogador que entra:**
1. `Conectar a servidor (mesma URL)`
2. `Entrar em sala (ID colado pelo anfitrião)`
3. `Marcar objeto como local` no Player

A partir daí, o engine envia automaticamente `x/y/anim` do(s) objeto(s) marcados como locais a cada `0.05s`. Para mover o player remoto, use `Definir posição X/Y` com expressão `NetworkPlayerX("id")` / `NetworkPlayerY("id")`.

---

## 3. Garantias de compatibilidade

- **Offline continua funcionando.** Nenhuma ação/condição de rede quebra se o WebSocket não foi aberto — todas falham silenciosamente.
- **HTML exportado funciona igual ao preview.** O `WebSocket` é nativo do browser; `buildStandaloneHTML` embute o script do engine inteiro (incluindo `Network`), então o jogo exportado se conecta ao mesmo servidor.
- **Pause respeitado.** Quando `runtime.paused` é verdadeiro, `dt` chega como 0 ao `Network.update`, então não há auto-envio nem interpolação durante pause.
- **Sem dependência de Node/servidor específico.** Você pode rodar qualquer servidor WebSocket que aceite mensagens JSON com `{type, ...}`. Protocolo esperado abaixo.

---

## 4. Protocolo (cliente ↔ servidor)

**Cliente envia:**
- `{type:"create_room"}`
- `{type:"join_room", roomId}`
- `{type:"leave_room"}`
- `{type:"input", input}`
- `{type:"state", objectId, name, x, y, anim}`
- `{type:"data", key, value}`

**Servidor envia (esperado):**
- `{type:"connected", playerId}` — atribui id para este socket
- `{type:"room_created", roomId}`
- `{type:"room_joined", roomId, isHost, players:[{id,x,y,state}, ...]}`
- `{type:"room_left"}`
- `{type:"player_joined", playerId, x, y, state}`
- `{type:"player_left", playerId}`
- `{type:"state", playerId, x, y, state}`

Qualquer outra mensagem com `type` válido cai como evento `data_received` na fila de eventos do engine.

---

## 5. API global

- `window.network` (= `Engine.Network`) — disponível no console e em scripts custom.
  - `network.connected`, `network.roomId`, `network.isHost`, `network.playerId`
  - `network.players` — `{ [id]: { x, y, targetX, targetY, state } }` (interpolação rolando 60×/s)
  - `network.sendInterval` — em segundos (mexa pra ajustar banda)
  - Métodos: `connect(url)`, `disconnect()`, `createRoom()`, `joinRoom(id)`, `leaveRoom()`, `send(obj)`

---

Tudo o resto do v6.1.9 continua **idêntico**. Esta versão só **adiciona** capacidade de rede.
