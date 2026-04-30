# electron/main.cjs

- 役割: Electron の main process。ウィンドウ作成とファイル読み書きを担当する。
- 主な状態: `mainWindow`、`currentFilePath`、`pendingOpenFilePath`、`isDirty`。
- 主な処理: ウィンドウ作成、開く、保存、別名保存、未保存確認。
- 呼ばれ方: `package.json` の Electron 起動で実行される。
- 依存: Electron、Node の `fs/promises`、`path`。
- 読むポイント: ファイル操作は renderer ではなく main process が行う。
- 読まなくていい部分: macOS の `activate` など Electron 定型処理。
