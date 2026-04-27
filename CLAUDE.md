# CLAUDE.md

このリポジトリは、TypeScript + Vite + Electron + Canvas で作るデスクトップ専用ローグライク制作テンプレートです。ユーザーが設定UIから敵、アイテム、階層ルール、描画、ログ文言を調整し、ゲーム開始前に設定してからプレイできる構成にしています。

## 基本コマンド

```bash
npm test          # TypeScript の型検証
npm run build     # 型検証 + Vite production build
npm run dev       # renderer用Vite開発サーバー
npm run desktop:dev  # Vite dev serverへ接続するElectronを起動
npm run desktop   # production build後にElectronを起動
```

変更後は少なくとも `npm test` と `npm run build` を通してください。

## ディレクトリ構成

| パス | 役割 |
|------|------|
| `src/engine/core/` | Game, TurnManager, Entity, EntityFactory, GameConfig |
| `src/engine/map/` | Map, Tile, DungeonGenerator, Fov, Collision |
| `src/engine/input/` | InputManager |
| `src/engine/rendering/` | Renderer |
| `src/engine/script/` | Script型定義, ScriptInterpreter |
| `src/engine/registry/` | AiRegistry, ItemEffectRegistry |
| `src/engine/utils/` | Logger, escapeHtml |
| `src/app/ui/` | ConfigPanel, ScriptEditor（設定UI） |
| `src/app/storage/` | ProjectStorage, DesktopProjectStorage（プロジェクト保存） |
| `src/game/` | サンプルゲーム固有の定義と初期化 |
| `src/game/sampleGameConfig.ts` | デフォルトのゲーム設定 |
| `src/main.ts` | アプリ起動、設定画面とプレイ開始の接続 |
| `electron/main.cjs` | Electron main process、ファイルダイアログ、ファイルI/O |
| `electron/preload.cjs` | rendererへ安全なIPC APIを公開 |

## 実装境界

**エンジン側 (`src/engine/`) に置くもの:**
- `core/` — ゲームループ、ターン進行、エンティティ、設定型定義
- `map/` — マップ、タイル、ダンジョン生成、FOV、衝突判定
- `input/` — キーボード入力
- `rendering/` — Canvas描画
- `script/` — ビジュアルスクリプト型定義・インタープリタ
- `registry/` — 敵AI・アイテム効果の拡張ポイント
- `utils/` — ログ、HTMLエスケープなどの汎用ユーティリティ

**アプリ側 (`src/app/`) に置くもの:**
- `ui/` — 設定パネル（ConfigPanel）、スクリプトエディタ（ScriptEditor）
- `storage/` — プロジェクト保存API（ProjectStorage）、Electron実装

**サンプルゲーム側 (`src/game/`) に置くもの:**
- 初期設定
- 敵、アイテム、階層ルール
- サンプル固有の配置や階層遷移

ゲーム固有の値を `Game.ts` に直書きしないでください。可能な限り `GameConfig` または `sampleGameConfig.ts` に寄せます。

## 設定と保存

設定は `GameConfig` を中心に扱い、プロジェクトJSONファイルとして保存します。

- `localStorage` は使用しません
- 保存/読込/初期化のUIは `ConfigPanel` が担当します
- ファイルダイアログとファイルI/Oは Electron main process が担当します
- rendererは `ProjectStorage` 経由で保存操作を呼びます
- 初期化時はファイルを削除せず、現在の設定を初期設定に戻し、ゲームも未開始状態に戻します

起動時は初期設定の新規プロジェクトとして開きます。保存済みプロジェクトは `開く` からJSONファイルを選択して読み込みます。

## 拡張ポイント

**敵AI (`src/engine/registry/AiRegistry.ts`)**
- 敵定義の `aiId` から実行されます
- 標準AI: `chase`, `stationary`, `random`

**アイテム効果 (`src/engine/registry/ItemEffectRegistry.ts`)**
- アイテム定義の `effectId` と `params` から実行されます
- 標準効果: `heal`, `equipWeapon`

新しいAIや効果を追加する場合は、Registryに処理を追加し、設定UIの選択肢（`src/app/ui/ConfigPanel.ts` の `aiOptions` / `effectOptions`）も更新してください。

## UI方針

- 起動直後はゲームを開始せず、設定してから `ゲームスタート`
- プレイ中の設定反映は1階から新規開始
- バッグ内アイテムは任意のアイテムを選んで使用
- Canvas上のモーダルは、バッグ満杯時などプレイ中判断が必要な時に使う
- 設定UIは長くなりやすいため、追加時は見通しを悪化させない配置にする

## 注意点

- 追加した敵やアイテムは、階層ルールの出現重み/出現率に入らないとゲーム内に出ません
- `ConfigPanel` で新規追加する敵/アイテムは、全階層ルールへ初期登録する仕様です
- `Renderer` の描画値は `config.render` を参照します
- FOV半径は `config.fov.radius`
- レベルアップ式は `config.progression`
- ログ文言は `config.messages` または `ConfigPanel` のテンプレートで扱います

## 変更時の確認チェックリスト

- [ ] `npm test` が成功する
- [ ] `npm run build` が成功する
- [ ] 起動直後に未開始画面が出る
- [ ] 設定後に `ゲームスタート` で開始できる
- [ ] 保存/読込/初期化の状態表示が崩れていない
- [ ] 未保存状態で新規/開く/初期化/終了しようとすると確認される
- [ ] バッグ内アイテムを選択して使える
