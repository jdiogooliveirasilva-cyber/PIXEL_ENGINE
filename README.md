# Pixel Engine 2D — Multiplayer (v6.3.0)

Engine 2D single-file (HTML) com sistema multiplayer **opcional** via WebSocket.
A engine continua **100% funcional offline** se o servidor não estiver rodando.

---

## ⚡ Como rodar

```bash
npm install
npm start
```

Depois abra no navegador:

```
http://localhost:3000
```

> No Replit a porta é definida automaticamente pela variável `PORT`.
> Em produção (HTTPS) o cliente conecta com `wss://` no mesmo host —
> não precisa configurar nada manualmente.

Para testar multiplayer local: abra a mesma URL em duas abas/janelas
diferentes (ou em dois aparelhos na mesma rede).

---

## 🎮 Como usar no editor

Dentro do editor de eventos, abra **Adicionar Condição** ou **Adicionar Ação**
e procure pela seção **MULTIPLAYER**.

### Condições
| Condição | O que faz |
|---|---|
| Ao receber mensagem da rede | Dispara quando outro jogador envia uma mensagem (com filtro de texto opcional). |
| Quando jogador entrar | Dispara uma vez quando outro jogador entra na sala atual. |
| Quando jogador sair | Dispara quando outro jogador sai (ou desconecta). |

### Ações
| Ação | O que faz |
|---|---|
| Criar sala / Entrar na sala | Conecta no servidor e entra na sala com o nome dado. |
| Enviar mensagem para rede | Envia uma string livre para todos da mesma sala. |
| Sincronizar posição do objeto | Envia `x, y` do objeto a ~30fps; outros jogadores veem um clone automático. |

---

## 🧠 Arquitetura

- **Servidor** (`server.js`): HTTP estático + WebSocket no mesmo servidor.
  Mantém um `Map<sala, Set<conexão>>` e faz broadcast **escopado por sala**.
  Cada conexão recebe um `playerId` único.

- **Cliente** (`Engine.Network` dentro de `index.html`):
  - `connect()` automático no primeiro uso, com auto-reconnect exponencial.
  - `joinRoom(name)` entra/cria sala.
  - `send(type, data)` envia mensagem para a sala.
  - Buffers por frame (`incomingMessages`, `joinEvents`, `leaveEvents`)
    drenados após cada `runEvents()` — assim as condições disparam
    no momento certo do loop do jogo, sem race condition.
  - **Clones remotos automáticos**: quando outro jogador envia `sync`
    com a posição do próprio objeto, a engine cria/atualiza um clone
    invisível-pra-ele do objeto correspondente, sem código extra.

- **Failsafe offline**: se o servidor cair, todas as ações `net_*`
  viram no-op silencioso e as condições `net_*` simplesmente não
  disparam. O jogo continua rodando normalmente.

- **HTML standalone**: o botão "Exportar HTML" da engine continua
  funcionando — o jogo exportado roda sozinho (sem servidor) e usa
  multiplayer apenas se for hospedado em um servidor compatível.

---

## 📡 Protocolo (referência)

```jsonc
// cliente → servidor
{ "type": "join",    "room": "arena1" }
{ "type": "leave" }
{ "type": "message", "data": { "msg": "ola" } }
{ "type": "sync",    "data": { "srcId": "o_xxx", "x": 100, "y": 50 } }

// servidor → cliente
{ "type": "welcome", "playerId": "p_1_abc" }
{ "type": "joined",  "room": "arena1", "playerId": "p_1_abc", "peers": ["p_2_xyz"] }
{ "type": "join",    "room": "arena1", "playerId": "p_2_xyz" }
{ "type": "leave",   "room": "arena1", "playerId": "p_2_xyz" }
// + qualquer mensagem custom é repassada para a mesma sala
```

---

## 📱 Mobile

Funciona em qualquer navegador moderno (iOS Safari, Android Chrome).
A WebSocket usa o mesmo host/porta do HTTP, então não há problema de
firewall em redes móveis ou hotspots.
