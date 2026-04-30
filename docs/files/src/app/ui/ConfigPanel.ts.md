# src/app/ui/ConfigPanel.ts

- 役割: 設定編集UIとプロジェクト保存・読込を担当する。
- 主な状態: `projectStatus`、`projectInfo`、`scriptEditors`、`config`、`storage`。
- 主な処理: 設定フォーム描画、フォーム反映、JSON読込、JSON保存、スクリプトエディタ配置。
- 呼ばれ方: `main.ts` で作られる。
- 依存: `ProjectStorage`、`ScriptEditor`、`escapeHtml`、`GameConfig`。
- 読むポイント: `render()`、`handleSubmit()`、`applyFormConfig()`、`importProject()` を見る。
- 読まなくていい部分: 各フォーム部品のHTML文字列生成。
