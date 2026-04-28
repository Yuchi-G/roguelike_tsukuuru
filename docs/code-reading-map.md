# コード読み解きマップ

このメモは、ローグライクツクールのコードを読むための全体地図です。

## 全体構造

```mermaid
flowchart TD
  ElectronMain["electron/main.cjs\nElectron main process\nファイルI/O・ウィンドウ作成"]
  Preload["electron/preload.cjs\n安全なIPC API公開"]
  Main["src/main.ts\nアプリ接続係"]
  Config["ConfigPanel\n設定UI・保存/読込"]
  Storage["ProjectStorage\n保存API抽象"]
  Scene["MainScene\nマップ/敵/アイテム生成"]
  Game["Game\nプレイ中状態・ターン処理"]
  Script["ScriptEditor / ScriptInterpreter\nスクリプト編集・実行"]

  ElectronMain --> Preload
  Preload --> Storage
  Main --> Config
  Main --> Scene
  Main --> Game
  Config --> Storage
  Config --> Script
  Config --> Scene
  Scene --> Game
  Game --> Script
```

## 起動からゲーム開始

```mermaid
sequenceDiagram
  participant E as Electron main
  participant P as preload
  participant M as main.ts
  participant C as ConfigPanel
  participant S as MainScene
  participant G as Game

  E->>E: BrowserWindow作成
  E->>P: preload読み込み
  P->>M: window.desktopProject公開
  M->>M: DOM取得
  M->>G: new Game()
  M->>S: new MainScene(game, config)
  M->>C: new ConfigPanel(...)

  C->>M: ゲームスタート(onApply)
  M->>S: scene.load(1)
  S->>S: ダンジョン生成
  S->>S: プレイヤー/敵/アイテム生成
  S->>G: game.start(map, player, enemies, items)
  G->>G: 入力ON・FOV計算・描画
```

## ゲーム中の1ターン

```mermaid
flowchart TD
  Input["キー入力\n矢印/WASD"] --> Move["Game.handlePlayerMove()"]
  Move --> CheckEnemy{"移動先に敵？"}
  CheckEnemy -->|Yes| Attack["Game.attack(player, enemy)"]
  CheckEnemy -->|No| TryMove["Game.tryMoveActor()"]
  TryMove --> Walkable{"移動できる？"}
  Walkable -->|No| LogWall["壁ログを出す"]
  Walkable -->|Yes| Pickup["pickupItems()"]
  Attack --> Finish["finishPlayerAction()"]
  Pickup --> Finish
  LogWall --> Refresh["refresh()"]

  Finish --> EnemyTurn["runEnemyTurn()"]
  EnemyTurn --> LevelUp["checkPlayerLevelUp()"]
  LevelUp --> Refresh

  Refresh --> FOV["FOV計算"]
  FOV --> Canvas["Canvas描画"]
  Canvas --> UI["ステータス/ログ/バッグUI更新"]
```

## 保存/読込

```mermaid
sequenceDiagram
  participant C as ConfigPanel
  participant S as DesktopProjectStorage
  participant P as preload
  participant E as electron/main.cjs
  participant FS as JSONファイル

  C->>S: openProject()
  S->>P: window.desktopProject.openProject()
  P->>E: ipcRenderer.invoke("project:open")
  E->>FS: ファイル選択・読み込み
  E-->>C: json + pending file path

  C->>C: importProject(json)
  alt JSON valid
    C->>S: confirmOpen()
    S->>E: project:confirm-open
    E->>E: currentFilePath確定
  else JSON invalid
    C->>S: discardPendingOpen()
    S->>E: project:discard-pending-open
  end
```

## スクリプトエンジン

```mermaid
flowchart TD
  ScriptType["Script.ts\nデータ型"] --> Editor["ScriptEditor\nGUIで編集"]
  Editor --> Config["ConfigPanel\n敵のaiScriptへ保存"]
  Config --> Enemy["Enemy.update()"]

  Enemy --> HasScript{"aiScriptあり？"}
  HasScript -->|Yes| Interpreter["ScriptInterpreter.run()"]
  HasScript -->|No| Registry["AiRegistry.run(aiId)"]

  Interpreter --> Nodes["executeNodes()"]
  Nodes --> Node["executeNode()"]
  Node --> Action["executeAction()"]
  Action --> GameOps["Game操作\nmove / attack / heal / log など"]
```

## 読む順番

1. `src/main.ts`
2. `src/game/MainScene.ts`
3. `src/engine/core/Game.ts`
4. `src/app/ui/ConfigPanel.ts`
5. `src/app/storage/ProjectStorage.ts`
6. `electron/preload.cjs`
7. `electron/main.cjs`
8. `src/engine/script/Script.ts`
9. `src/app/ui/ScriptEditor.ts`
10. `src/engine/script/ScriptInterpreter.ts`

最初の理解目標は、`ConfigPanel` が設定を作り、`MainScene` がゲームを組み立て、`Game` がプレイを進める、と説明できることです。
