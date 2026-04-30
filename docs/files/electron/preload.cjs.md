# electron/preload.cjs

- 役割: IPCを `window.desktopProject` として renderer に公開する。
- 主な状態: なし。
- 主な処理: `contextBridge.exposeInMainWorld()` で保存・読込APIを公開する。
- 呼ばれ方: `electron/main.cjs` の BrowserWindow 設定で読み込まれる。
- 依存: Electron の `contextBridge`、`ipcRenderer`。
- 読むポイント: `DesktopProjectStorage` が呼ぶメソッドの実体を見る。
- 読まなくていい部分: IPCチャンネル名の暗記。
