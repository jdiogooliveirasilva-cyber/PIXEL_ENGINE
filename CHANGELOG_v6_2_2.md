# PixelEngine 2D — v6.2.2

## Resumo
Versão de **limpeza cirúrgica**: removeu o multiplayer por completo e
melhorou a UX de adição de objetos. Single-file, continua rodando 100%
offline tanto no preview quanto no HTML exportado.

---

## Removido (multiplayer extirpado)

A engine não tem mais nenhuma dependência de WebSocket / servidor.

- **Módulo `Network`** inteiro deletado (era ~170 linhas com `connect`,
  `disconnect`, `createRoom`, `joinRoom`, `leaveRoom`, `send`,
  `_handleMessage`, `_pushEvent`, `consumeEvents`, `update`, fila de
  eventos, interpolação de jogadores remotos, throttle de auto-envio).
- **`makeMultiplayerDemoProject`** (gerador do projeto demo Menu+Battle)
  removido junto.
- **`window.network`** (atalho global) removido.
- **API pública** (`return { ... }` do IIFE da engine) não exporta mais
  `Network` nem `makeMultiplayerDemoProject`.
- **Conditions** (sistema de eventos):
  - `net_connected`
  - `net_in_room`
  - `net_is_host`
  - `net_event` (com seus 9 sub-tipos)
- **Actions**:
  - `net_connect`, `net_disconnect`
  - `net_create_room`, `net_join_room`, `net_leave_room`
  - `net_send_input`, `net_send_state`, `net_send_data`
  - `net_set_local`, `net_unset_local`, `net_set_send_interval`
- **Expressions**: `NetworkConnected`, `NetworkInRoom`, `NetworkIsHost`,
  `NetworkPlayerCount`, `NetworkPlayerX("id")`, `NetworkPlayerY("id")`.
- **Picker UIs**: as seções "REDE — MULTIPLAYER" sumiram do menu de
  Conditions e do menu de Actions; os prompts modais (`net_event`,
  `net_connect`, `net_join_room`, `net_send_*`, `net_set_local`,
  `net_set_send_interval`) também sumiram.
- **Botão "Carregar Demo Multiplayer"** (`btnLoadDemoMP`) e a função
  `loadMultiplayerDemo()` foram removidos.
- **Hooks de runtime** removidos: `runtime._netEvents = Network.consumeEvents()`
  e `Network.update(scene, runtime, dt)` no loop principal; reset de
  `runtime._netEvents` ao trocar de cena.
- **Flag por-objeto** `obj._netLocal` não é mais lida em lugar nenhum.

> Todas as remoções estão marcadas no código com comentários
> `// v6.2.2 — REMOVIDO: …` para facilitar auditoria futura.

### O que NÃO mudou
Sistemas preservados sem modificação funcional:

- Render (Canvas 2D, câmera, zoom, transitions, partículas, luzes).
- Física (gravidade, colisões AABB, plataformer, slopes opcionais).
- Input (teclado, touch, gamepad simulado).
- Eventos (todas as conditions/actions não-rede continuam idênticas).
- Animações, áudio, save game, behaviors, tweens, multi-cena.
- Export para HTML standalone.

---

## Painel inferior (resizer)

Constraint atualizada para casar com a UX já existente:

```css
#sceneBottom { min-height: 120px; max-height: 70%; height: 260px; }
```

O drag pelo divisor já era suave (Pointer Events + persistência em
localStorage). Apenas os limites foram afinados — agora o usuário não
consegue mais "esconder" o painel acidentalmente nem deixá-lo gigante a
ponto de comer o canvas.

---

## Adicionar Objeto (UX repaginada)

### Antes
- Botão pequeno **"＋ Obj"** apertado dentro da `#toolbar`.
- Modal mostrava 8 *presets* opinativos ("Player", "Inimigo",
  "Plataforma", "Coletável", "Botão UI", "Luz", "Emissor de Partículas",
  "Vazio") — confundia quem queria só um objeto base pra editar depois.

### Agora (v6.2.2)
- Botão **`.add-obj-cta`**: full-width, gradiente `#7a5cff → #5be4ff`,
  `min-height: 48px`, sticky no topo da aba **Objetos**, sombra suave.
  É a primeira coisa que o usuário vê ao abrir a lista.
- Botão antigo da toolbar **removido** (sem duplicação).
- Modal lista **5 TIPOS** de objeto (não mais presets):
  1. **Sprite** — `kind=sprite`, bloco visual / personagem animado.
  2. **Texto** — `kind=text`, renderiza string com fonte/tamanho/cor.
  3. **Partícula** — emissor já com `enabled=true, emitting=true`.
  4. **Tile** — bloco estático (`physics.static=true, gravity=false`).
  5. **UI** — elemento na camada `UI`.

  Cada tipo cria um objeto base mínimo; o usuário ajusta o resto pelo
  painel de propriedades.

---

## Mobile / touch

- Floor universal `min-height: 44px` em `button` (limiar de toque do
  iOS HIG e do Material Design).
- Padding `10px 14px` confortável.
- Opt-out via classes `.small`, `.del`, `.ev-collapse-btn`,
  `.ev-group-toggle`, `.ev-group-del`, `#toolbar .grid-btn`,
  `#sceneBottomTabs button`, `.event-controls button`,
  `.frame-toolbar button` — para botões internos compactos que não
  precisam do alvo de toque grande.

---

## Auditoria

- Arquivo único `PixelEngine.html` (sem build step, sem dependências).
- `Engine.VERSION === "6.2.2"`.
- Grep de `Network|net_*|btnLoadDemoMP|loadMultiplayerDemo|makeMultiplayerDemoProject|window.network|_netLocal|_netEvents|NetworkConnected`
  só retorna comentários `// v6.2.2 — REMOVIDO: …`.
- Comportamento idêntico no preview interno e no HTML exportado.
