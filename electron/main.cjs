const { app, BrowserWindow, dialog, ipcMain } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");

let mainWindow = null;
let currentFilePath = null;
let isDirty = false;

const isDev = process.env.VITE_DEV_SERVER_URL !== undefined;

function projectInfo() {
  return {
    filePath: currentFilePath,
    isDirty,
  };
}

async function confirmDiscardUnsaved() {
  if (!isDirty || !mainWindow) return true;

  const result = await dialog.showMessageBox(mainWindow, {
    type: "warning",
    buttons: ["続行", "キャンセル"],
    defaultId: 1,
    cancelId: 1,
    title: "未保存の変更",
    message: "未保存の変更があります。続行しますか？",
    detail: "続行すると、保存していない変更は失われます。",
  });

  return result.response === 0;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on("close", async (event) => {
    if (!isDirty) return;

    event.preventDefault();
    if (await confirmDiscardUnsaved()) {
      isDirty = false;
      mainWindow.close();
    }
  });

  if (isDev) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

ipcMain.handle("project:new", async () => {
  currentFilePath = null;
  isDirty = false;
  return projectInfo();
});

ipcMain.handle("project:open", async () => {
  if (!(await confirmDiscardUnsaved())) {
    return { canceled: true };
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: "プロジェクトを開く",
    filters: [{ name: "Roguelike Project", extensions: ["json"] }],
    properties: ["openFile"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  try {
    const filePath = result.filePaths[0];
    const json = await fs.readFile(filePath, "utf8");
    currentFilePath = filePath;
    isDirty = false;
    return { canceled: false, json, filePath };
  } catch (error) {
    return { canceled: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle("project:save", async (_event, json) => {
  if (!currentFilePath) {
    return saveAs(json);
  }

  try {
    await fs.writeFile(currentFilePath, json, "utf8");
    isDirty = false;
    return { canceled: false, filePath: currentFilePath };
  } catch (error) {
    return { canceled: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle("project:save-as", async (_event, json) => {
  return saveAs(json);
});

ipcMain.handle("project:info", () => projectInfo());

ipcMain.handle("project:set-dirty", (_event, dirty) => {
  isDirty = Boolean(dirty);
  return projectInfo();
});

async function saveAs(json) {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "名前を付けて保存",
    defaultPath: currentFilePath ?? "roguelike-project.json",
    filters: [{ name: "Roguelike Project", extensions: ["json"] }],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  try {
    await fs.writeFile(result.filePath, json, "utf8");
    currentFilePath = result.filePath;
    isDirty = false;
    return { canceled: false, filePath: currentFilePath };
  } catch (error) {
    return { canceled: false, error: error instanceof Error ? error.message : String(error) };
  }
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

