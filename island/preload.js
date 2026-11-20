const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('island', {
  onUsage: (cb) => ipcRenderer.on('usage', (_e, data) => cb(data)),
  onActivity: (cb) => ipcRenderer.on('activity', (_e, data) => cb(data)),
  onPrefs: (cb) => ipcRenderer.on('prefs', (_e, data) => cb(data)),
  setMouseOver: (over) => ipcRenderer.send('mouse-over', over),
});
