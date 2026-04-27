const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopProject", {
  newProject: () => ipcRenderer.invoke("project:new"),
  openProject: () => ipcRenderer.invoke("project:open"),
  saveProject: (json) => ipcRenderer.invoke("project:save", json),
  saveProjectAs: (json) => ipcRenderer.invoke("project:save-as", json),
  confirmOpen: () => ipcRenderer.invoke("project:confirm-open"),
  discardPendingOpen: () => ipcRenderer.invoke("project:discard-pending-open"),
  getCurrentProjectInfo: () => ipcRenderer.invoke("project:info"),
  setDirty: (isDirty) => ipcRenderer.invoke("project:set-dirty", isDirty),
});
