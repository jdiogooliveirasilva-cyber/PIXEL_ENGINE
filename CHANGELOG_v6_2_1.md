# PixelEngine2D — v6.2.1 (Sistema de Cenas + Demo Multiplayer)

Continuação direta da v6.2.0. **Nada foi removido nem reescrito** — todos os
sistemas existentes (render, input, físicas, eventos, animação, áudio, rede,
v6 PRO etc.) continuam funcionando exatamente como antes.

## ✨ Novidades

### 1. Sistema de Cenas (multi-cena)
Antes o projeto tinha uma única cena (`project.scene`). Agora suporta várias
cenas nomeadas, com troca em runtime.

- **Estrutura nova**: `project.scenes = { Menu: {...}, Battle: {...} }`,
  `project.currentSceneName`, `project.startScene`.
- **Compatibilidade total**: projetos antigos (versão 1/2) sobem para versão 3
  via `migrateProject()` automaticamente — a cena única vira `"Main"` e os
  campos antigos (`project.scene/objects/events/eventGroups/variables`) viram
  *aliases por referência* da cena ativa, então nenhum código velho quebra.
- **Aba "Cenas"** no editor: criar / renomear / deletar / definir cena inicial
  / pular para editar uma cena específica. Inclui botão **"🎮 Carregar Demo
  Multiplayer"**.
- **Runtime**: `runtime.changeScene(name)` e `runtime.restartScene()` —
  aplicados no início do próximo frame (`_applySceneChange`), recriando os
  objetos a partir do estado salvo. Variáveis e timers da nova cena começam
  zerados.
- **Módulo público**: `Engine.Scenes` (`change`, `restart`, `current`, `list`).

### 2. Condição nova
- **`scene_is`** — *Cena atual = X*. Útil para eventos globais que só devem
  rodar em uma cena específica.

### 3. Ações novas (categoria **CENAS**)
- **`change_scene`** — troca para outra cena (selector com as cenas existentes,
  fallback texto livre).
- **`restart_scene`** — reinicia a cena atual.

Se a cena alvo não existir, a ação é ignorada silenciosamente — o jogo continua
rodando na cena atual.

### 4. Template "Demo Multiplayer"
`Engine.makeMultiplayerDemoProject()` cria um projeto pronto com 2 cenas:

- **Menu** — botões *Criar sala* / *Entrar em sala* (usa as ações de rede
  v6.2.0 + `change_scene("Battle")` quando entrar na sala).
- **Battle** — jogador local + sincronização automática via
  `net_set_local`, voltar pro menu com a tecla ESC.

Carregável via botão **"🎮 Carregar Demo Multiplayer"** nas Configurações ou
programaticamente com `Engine.makeMultiplayerDemoProject()`.

## 🔧 Mudanças internas
- `createRuntime` agora usa `scenesStore = project.scenes` como fonte de verdade
  e copia profundamente cada cena ao recriá-la (evita mutação cruzada).
- `_stepBody` checa `_pendingScene` no topo do frame e chama
  `_applySceneChange` antes de qualquer evento — garante transições limpas.
- `migrateProject` v3: quando converte um projeto v1/v2, religa `project.scene`,
  `project.objects`, `project.events`, `project.eventGroups` e
  `project.variables` como *aliases por referência* para
  `project.scenes[currentSceneName]`. Tudo que lê `project.objects` continua
  funcionando, e tudo que escreve nesse caminho também atualiza
  `project.scenes`.
- `autoSave` agora chama `syncCurrentSceneToScenes()` antes de serializar,
  garantindo que edições no editor sempre persistam na cena ativa.

## ⚠ Compatibilidade
- **100% retrocompatível** com projetos v6.1.x e v6.2.0.
- Eventos antigos continuam rodando sem alteração — o sistema de cenas é
  opcional. Quem nunca tocar na aba "Cenas" tem exatamente o comportamento
  anterior, com uma cena chamada `"Main"`.
- HTML exportado funciona idêntico — `Engine.Scenes` é exportado junto com o
  resto do runtime.

## 📦 Como usar
1. Abra `PixelEngine.html` no navegador.
2. Clique na aba **Configurações → 🎮 Carregar Demo Multiplayer** para ver o
   sistema de cenas + multiplayer rodando.
3. Para o seu projeto: aba **Cenas** → criar nova cena → trocar entre cenas
   com a ação **CENAS → Trocar de cena**.
